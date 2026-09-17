import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader.tsx';
import Toast from '../components/Toast.tsx';

export default function RideSummaryScreen() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayProgress, setReplayProgress] = useState(100);

  const [toastMessage, setToastMessage] = useState('');
  const [toastIcon, setToastIcon] = useState('check_circle');
  const [isToastOpen, setIsToastOpen] = useState(false);

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

  const handleReplayRoute = () => {
    setIsReplaying(true);
    setReplayProgress(0);
    showToast('Replaying verified safe corridor telemetry...', 'play_circle');

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

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'SafeRoute Commute Summary',
          text: 'I completed a safe ride across Bengaluru with SafeRoute, avoiding 4 road hazards!',
          url: window.location.href,
        })
        .catch(() => showToast('Summary link copied to clipboard!', 'content_copy'));
    } else {
      showToast('Summary link copied to clipboard!', 'content_copy');
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
              You avoided 4 dangerous road craters and kept your vehicle safe today.
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
                <span className="font-display text-2xl font-bold text-on-surface">14.8</span>
                <span className="font-label-md text-secondary">km</span>
              </div>
              <span className="font-body-sm text-[11px] text-emerald-700 font-medium mt-1">Saved 4 mins</span>
            </div>

            {/* Card 2: Duration */}
            <div className="bg-surface-container-low p-4 rounded-2xl shadow-sm flex flex-col border border-outline-variant/10">
              <div className="flex items-center justify-between text-secondary mb-1">
                <span className="font-label-sm uppercase font-semibold">Duration</span>
                <span className="material-symbols-outlined text-primary text-[18px]">timer</span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-display text-2xl font-bold text-on-surface">32</span>
                <span className="font-label-md text-secondary">min 14s</span>
              </div>
              <span className="font-body-sm text-[11px] text-secondary mt-1">Avg 27.6 km/h</span>
            </div>

            {/* Card 3: Potholes Avoided */}
            <div className="bg-surface-container-low p-4 rounded-2xl shadow-sm flex flex-col border border-outline-variant/10">
              <div className="flex items-center justify-between text-secondary mb-1">
                <span className="font-label-sm uppercase font-semibold">Avoided</span>
                <span className="material-symbols-outlined text-on-tertiary-container text-[18px]">security</span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-display text-2xl font-bold text-on-tertiary-container">4</span>
                <span className="font-label-md text-secondary">Craters</span>
              </div>
              <span className="font-body-sm text-[11px] text-emerald-700 font-medium mt-1">0 Impacts detected</span>
            </div>

            {/* Card 4: Civic XP */}
            <div className="bg-surface-container-low p-4 rounded-2xl shadow-sm flex flex-col border border-outline-variant/10">
              <div className="flex items-center justify-between text-secondary mb-1">
                <span className="font-label-sm uppercase font-semibold">Civic XP</span>
                <span className="material-symbols-outlined text-primary text-[18px]">military_tech</span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-display text-2xl font-bold text-primary">+85</span>
                <span className="font-label-md text-secondary">XP</span>
              </div>
              <span className="font-body-sm text-[11px] text-primary font-medium mt-1">Road Scout Lv. 4</span>
            </div>
          </div>

          {/* Interactive Route Map Preview with Replay */}
          <div className="bg-surface-container-low rounded-3xl p-4 shadow-sm flex flex-col gap-3 border border-outline-variant/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">map</span>
                <span className="font-label-lg font-bold text-primary">Route Corridor & Potholes</span>
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

            {/* Map Preview Box */}
            <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-primary/20">
              <img
                alt="Route completed map preview"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCkQn24Yq39Va8vQSjVnHMO6U-0SAdgVy5C_YcEPgB1h4et5NjM3jF7KoK5sTr7SdTqgkVT5nE3K5_etTIinj9tsqg7qi1PWPQuW_sP8FUe1lbAmJNm7ga3-0NiX7QjeTpQUKiYDx0uMcKQDUaePLjRMnZjLYEgfaRIQDcZ8vAAqJx2oUQxNuLOWQUcVBtk-8C8OLUWRMpAuwgAR-ifE0lf4VjBHIae9hn5BSPaQwtatX7TyG4ATNff"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent"></div>

              {/* Vector line representing route taken */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 176">
                <path
                  d="M 40 140 L 90 95 L 170 105 L 240 50 L 280 30"
                  fill="none"
                  stroke="#dd9202"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray="280"
                  strokeDashoffset={280 - (280 * replayProgress) / 100}
                />
                {/* Pins */}
                <circle cx="90" cy="95" r="5" fill="#ba1a1a" />
                <circle cx="170" cy="105" r="5" fill="#ba1a1a" />
                <circle cx="240" cy="50" r="5" fill="#ffb955" />
                {/* Start & End Points */}
                <circle cx="40" cy="140" r="6" fill="#1f3864" stroke="#ffffff" strokeWidth="2" />
                <circle cx="280" cy="30" r="6" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
              </svg>

              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white">
                <span className="font-semibold bg-black/50 px-2 py-0.5 rounded-md">Start: Koramangala</span>
                <span className="font-semibold bg-emerald-900/80 px-2 py-0.5 rounded-md">Arrived: Indiranagar</span>
              </div>
            </div>
          </div>

          {/* Section: Hazards Encountered Breakdown */}
          <div className="flex flex-col gap-space-sm">
            <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
              Hazards Handled on This Trip
            </h3>

            <div className="flex flex-col gap-2">
              <div className="p-3 rounded-2xl bg-surface-container-low flex items-center justify-between gap-3 border border-outline-variant/10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-error-container text-error flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">warning</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-label-md font-bold text-on-surface truncate">
                      100ft Road, Indiranagar
                    </p>
                    <p className="font-body-sm text-[12px] text-secondary truncate">
                      Severe crater (14cm deep) • Bypassed via lane shift
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-label-sm text-xs font-semibold shrink-0">
                  Safely Avoided
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-container-low flex items-center justify-between gap-3 border border-outline-variant/10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">water_damage</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-label-md font-bold text-on-surface truncate">
                      Domlur Flyover Underpass
                    </p>
                    <p className="font-body-sm text-[12px] text-secondary truncate">
                      Waterlogged puddle • Slowed to 18 km/h
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-label-sm text-xs font-semibold shrink-0">
                  Caution Passed
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-container-low flex items-center justify-between gap-3 border border-outline-variant/10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">report_problem</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-label-md font-bold text-on-surface truncate">
                      Intermediate Ring Rd
                    </p>
                    <p className="font-body-sm text-[12px] text-secondary truncate">
                      Unmarked speed hump • Audible alert fired
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-label-sm text-xs font-semibold shrink-0">
                  Alerted
                </span>
              </div>
            </div>
          </div>

          {/* Civic Community Impact Card */}
          <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-container text-on-primary p-4 shadow-lg flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-surface-container-lowest/15 flex items-center justify-center text-tertiary-fixed-dim shrink-0">
              <span className="material-symbols-outlined text-2xl">favorite</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-label-md text-sm font-bold text-on-primary">Civic Impact</p>
              <p className="font-body-sm text-xs text-on-primary-container leading-tight mt-0.5">
                Your ride telemetry helped 128 other Bengaluru commuters avoid these road hazards today!
              </p>
            </div>
          </div>

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
            <span className="font-label-sm text-xs">BBMP Citizen Roads Initiative Verified</span>
          </div>
        </div>
      </main>

      <Toast message={toastMessage} icon={toastIcon} isOpen={isToastOpen} onClose={() => setIsToastOpen(false)} />
    </div>
  );
}
