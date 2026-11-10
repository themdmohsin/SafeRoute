import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader.tsx';
import Toast from '../components/Toast.tsx';
import { apiRequest } from '../lib/api';
import HazardMap, { type MapHazard } from '../components/HazardMap.tsx';
import type { LatLng } from '../lib/geo';

interface RideSummaryData {
  distanceKm: number;
  durationMinutes: number;
  hazardsDetectedCount: number;
  hazardsReportedCount: number;
  safetyScore: number;
  destination?: string;
  route?: LatLng[];
}

export default function RideSummaryScreen() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayProgress, setReplayProgress] = useState(100);

  const [toastMessage, setToastMessage] = useState('');
  const [toastIcon, setToastIcon] = useState('check_circle');
  const [isToastOpen, setIsToastOpen] = useState(false);
  const [ride, setRide] = useState<RideSummaryData | null>(null);
  const [rideError, setRideError] = useState('');
  const [hazards, setHazards] = useState<MapHazard[]>([]);

  useEffect(() => {
    const rideId = localStorage.getItem('saferoute_summary_ride_id');
    if (!rideId) {
      setRideError('No completed ride was selected.');
      return;
    }
    apiRequest<{ ride: RideSummaryData }>(`/rides/${rideId}`)
      .then(({ ride: completedRide }) => setRide(completedRide))
      .catch((error) => setRideError(error instanceof Error ? error.message : 'Unable to load ride summary.'));
    apiRequest<{ hazards: MapHazard[] }>('/hazards?limit=100').then((r) => setHazards(r.hazards)).catch(() => undefined);
  }, []);

  const showToast = (msg: string, icon = 'check_circle') => {
    setToastMessage(msg);
    setToastIcon(icon);
    setIsToastOpen(true);
  };

  // Canvas Confetti Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = 360);

    const colors = ['#dd9202', '#ffb955', '#1f3864', '#03224d', '#ba1a1a', '#00d2ff', '#10b981'];
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      vRot: number;
      alpha: number;
    }> = [];

    for (let i = 0; i < 70; i++) {
      particles.push({
        x: width / 2 + (Math.random() - 0.5) * 80,
        y: 120 + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 9,
        vy: -Math.random() * 8 - 3,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 10,
        alpha: 1,
      });
    }

    let animationFrameId: number;
    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      let aliveCount = 0;
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22; // gravity
        p.vx *= 0.98;
        p.rotation += p.vRot;
        if (frame > 60) {
          p.alpha = Math.max(0, p.alpha - 0.012);
        }

        if (p.alpha > 0 && p.y < height + 40) {
          aliveCount++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
          ctx.restore();
        }
      });

      if (aliveCount > 0) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const routePoints = ride?.route || [];
  const shownRoute = routePoints.slice(0, Math.max(1, Math.ceil((routePoints.length * replayProgress) / 100)));

  const handleReplayRoute = () => {
    if (routePoints.length < 2) {
      showToast('No GPS track was recorded for this ride.', 'info');
      return;
    }
    setIsReplaying(true);
    setReplayProgress(0);

    let current = 0;
    const interval = setInterval(() => {
      current += 5;
      if (current >= 100) {
        setReplayProgress(100);
        setIsReplaying(false);
        clearInterval(interval);
      } else {
        setReplayProgress(current);
      }
    }, 50);
  };

  const handleShare = async () => {
    const text = `My SafeRoute ride: ${ride?.distanceKm?.toFixed(1) ?? 0} km in ${ride?.durationMinutes ?? 0} min, safety score ${ride?.safetyScore ?? '—'}/100, ${ride?.hazardsReportedCount ?? 0} hazards reported.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'SafeRoute ride summary', text });
        return;
      }
      await navigator.clipboard.writeText(text);
      showToast('Ride summary copied to your clipboard.', 'content_copy');
    } catch (error) {
      // AbortError = the user closed the share sheet; nothing to report.
      if (error instanceof Error && error.name === 'AbortError') return;
      showToast('Could not share or copy. Your browser blocked it.', 'error');
    }
  };

  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-secondary-container">
      {/* Header title FIXED to "Ride Summary" */}
      <AppHeader title="Ride Summary" variant="subpage" onBack={() => navigate('/home')} />

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-safe bg-surface max-w-lg mx-auto">
        {/* Top Confetti Canvas Layer */}
        <canvas
          ref={canvasRef}
          className="absolute top-16 inset-x-0 w-full pointer-events-none z-30"
          style={{ height: '360px' }}
        />

        <div className="flex flex-col w-full px-margin pb-space-xl gap-space-lg relative z-10">
          {/* Celebratory Hero Card */}
          <div className="pt-space-md flex flex-col items-center text-center gap-space-xs">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tertiary-fixed-dim/30 text-on-tertiary-container">
              <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified
              </span>
              <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider">
                Ride Completed • Just Now
              </span>
            </div>

            <div className="relative my-2">
              <div className="w-20 h-20 rounded-3xl bg-primary text-tertiary-fixed-dim flex items-center justify-center shadow-2xl shadow-primary/25 relative z-10">
                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  sports_score
                </span>
              </div>
              <div className="absolute inset-0 rounded-3xl bg-tertiary-container blur-lg opacity-40"></div>
            </div>

            <h2 className="font-headline-lg-mobile text-2xl sm:text-3xl text-primary font-bold tracking-tight">
              Safe Commute Finished!
            </h2>
            <p className="font-body-md text-secondary max-w-xs mt-1">
              This ride was saved to your account with its GPS track and hazard counts.
            </p>
          </div>

          {/* Telemetry Stat Matrix (4 key metrics) */}
          <div className="grid grid-cols-2 gap-space-sm">
            {/* Card 1: Distance */}
            <div className="bg-surface-container-low p-4 rounded-2xl shadow-sm flex flex-col border border-outline-variant/10">
              <div className="flex items-center justify-between text-secondary mb-1">
                <span className="font-label-sm uppercase font-semibold">Distance</span>
                <span className="material-symbols-outlined text-primary text-[18px]">straighten</span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
              <span className="font-display text-2xl font-bold text-on-surface">{ride && ride.distanceKm > 0 ? ride.distanceKm.toFixed(1) : '—'}</span>
                <span className="font-label-md text-secondary">km</span>
              </div>
              <span className="font-body-sm text-[11px] text-secondary mt-1">Measured from your GPS track</span>
            </div>

            {/* Card 2: Duration */}
            <div className="bg-surface-container-low p-4 rounded-2xl shadow-sm flex flex-col border border-outline-variant/10">
              <div className="flex items-center justify-between text-secondary mb-1">
                <span className="font-label-sm uppercase font-semibold">Duration</span>
                <span className="material-symbols-outlined text-primary text-[18px]">timer</span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-display text-2xl font-bold text-on-surface">{ride?.durationMinutes ?? '—'}</span>
                <span className="font-label-md text-secondary">minutes</span>
              </div>
              <span className="font-body-sm text-[11px] text-secondary mt-1">
                {ride && ride.durationMinutes > 0 ? `Avg ${(ride.distanceKm / (ride.durationMinutes / 60)).toFixed(0)} km/h` : 'Average speed needs 1+ min'}
              </span>
            </div>

            {/* Card 3: Potholes Avoided */}
            <div className="bg-surface-container-low p-4 rounded-2xl shadow-sm flex flex-col border border-outline-variant/10">
              <div className="flex items-center justify-between text-secondary mb-1">
                <span className="font-label-sm uppercase font-semibold">Hazards</span>
                <span className="material-symbols-outlined text-on-tertiary-container text-[18px]">security</span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-display text-2xl font-bold text-on-tertiary-container">{ride?.hazardsDetectedCount ?? '—'}</span>
                <span className="font-label-md text-secondary">hazards</span>
              </div>
              <span className="font-body-sm text-[11px] text-emerald-700 font-medium mt-1">Warned about or auto-detected</span>
            </div>

            {/* Card 4: Civic XP */}
            <div className="bg-surface-container-low p-4 rounded-2xl shadow-sm flex flex-col border border-outline-variant/10">
              <div className="flex items-center justify-between text-secondary mb-1">
                <span className="font-label-sm uppercase font-semibold">Civic XP</span>
                <span className="material-symbols-outlined text-primary text-[18px]">military_tech</span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-display text-2xl font-bold text-primary">{ride?.hazardsReportedCount ?? '—'}</span>
                <span className="font-label-md text-secondary">reports</span>
              </div>
              <span className="font-body-sm text-[11px] text-primary font-medium mt-1">Submitted during this ride</span>
            </div>
          </div>
          {rideError && <p className="text-sm text-error" role="alert">{rideError}</p>}

          {/* Interactive Route Map Preview with Replay */}
          <div className="bg-surface-container-low rounded-3xl p-4 shadow-sm flex flex-col gap-3 border border-outline-variant/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">map</span>
                <span className="font-label-lg font-bold text-primary">Your route and nearby hazards</span>
              </div>
              <button
                onClick={handleReplayRoute}
                className="flex items-center gap-1 text-surface-tint hover:text-primary font-label-sm font-semibold cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isReplaying ? 'sync' : 'replay'}
                </span>
                <span>{isReplaying ? 'Replaying...' : 'Replay Route'}</span>
              </button>
            </div>

            {routePoints.length > 1 ? (
              <HazardMap
                center={routePoints[Math.floor(routePoints.length / 2)]}
                user={shownRoute[shownRoute.length - 1]}
                hazards={hazards}
                paths={[{ points: routePoints, color: '#94a3b8', width: 4, dashed: true }, { points: shownRoute, color: '#dd9202', width: 5 }]}
                className="h-56 rounded-2xl"
                initialZoom={15}
              />
            ) : (
              <p className="rounded-2xl bg-surface-container p-4 text-sm text-secondary">
                No GPS track was recorded for this ride. Allow location access during the next ride to see your route here.
              </p>
            )}
          </div>

          <section className="flex flex-col gap-space-sm">
            <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Ride report summary</h3>
            <div className="rounded-2xl bg-surface-container-low p-4 text-sm text-secondary">
              {ride?.destination ? `Destination: ${ride.destination}. ` : ''}
              Safety score {ride?.safetyScore ?? '—'}/100. You submitted {ride?.hazardsReportedCount ?? 0} reports and passed or auto-detected {ride?.hazardsDetectedCount ?? 0} hazards.
            </div>
          </section>
          {/* Primary CTA Buttons */}
          <div className="flex flex-col gap-space-sm pt-2">
            <button
              onClick={() => navigate('/home')}
              className="w-full h-14 rounded-2xl bg-primary text-on-primary font-headline-sm text-headline-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-[0.98] transition-transform cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">home</span>
              <span>Return to Home Dashboard</span>
            </button>

            <button
              onClick={handleShare}
              className="w-full h-12 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-label-lg text-label-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">share</span>
              <span>Share Ride Telemetry</span>
            </button>
          </div>

          {/* Footer note */}
          <div className="flex items-center justify-center gap-1.5 text-secondary text-center pt-1">
            <span className="material-symbols-outlined text-[16px] text-surface-tint">verified_user</span>
            <span className="font-label-sm text-xs">Your reports feed the city hazard dashboard</span>
          </div>
        </div>
      </main>

      <Toast message={toastMessage} icon={toastIcon} isOpen={isToastOpen} onClose={() => setIsToastOpen(false)} />
    </div>
  );
}
