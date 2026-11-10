import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader.tsx';
import BottomNav from '../components/BottomNav.tsx';
import HazardMap, { type MapHazard } from '../components/HazardMap.tsx';
import { apiRequest } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { BENGALURU, distanceM, distanceToLineM, pathLengthKm, reverseGeocode, speak, type LatLng } from '../lib/geo';
import { AUTODETECT_KEY, PLAN_KEY, TRACK_KEY, hazardPoint, readJson, type RidePlan } from '../lib/ridePlan';
import { sampleFromEvent, summarizeWindow, type MotionSample } from '../lib/sensorWindow';

const WARN_M = 200;
const PASSED_M = 30;
const QUICK_TAGS = [
  { label: 'Pothole', type: 'pothole', icon: 'circle' },
  { label: 'Waterlog', type: 'waterlogging', icon: 'water' },
  { label: 'Open manhole', type: 'open_manhole', icon: 'construction' },
  { label: 'Unmarked bump', type: 'speed_breaker', icon: 'speed' },
];
type MotionPermission = { requestPermission?: () => Promise<'granted' | 'denied'> };

export default function ActiveRideScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const rideId = localStorage.getItem('saferoute_active_ride_id');
  const [plan, setPlan] = useState<RidePlan | null>(() => readJson<RidePlan>(PLAN_KEY));
  const [track, setTrack] = useState<LatLng[]>(() => readJson<LatLng[]>(TRACK_KEY) || []);
  const [pos, setPos] = useState<LatLng | null>(null);
  const [speedKmh, setSpeedKmh] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState('');
  const [road, setRoad] = useState('');
  const [hazards, setHazards] = useState<MapHazard[]>([]);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [voiceActive, setVoiceActive] = useState(user?.preferences?.audibleAlerts ?? true);
  const [passed, setPassed] = useState<string[]>([]);
  const [mlDetections, setMlDetections] = useState(0);
  const [sensorState, setSensorState] = useState<'off' | 'needs-permission' | 'on' | 'unsupported'>('off');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ title: string; sub?: string } | null>(null);
  const announced = useRef(new Set<string>());
  const lastGeocode = useRef<{ at: number; p: LatLng } | null>(null);
  const posRef = useRef<LatLng | null>(null);
  const speedRef = useRef<number | null>(null);

  const notify = (title: string, sub?: string) => {
    setToast({ title, sub });
    window.setTimeout(() => setToast(null), 3500);
  };

  const loadHazards = () => apiRequest<{ hazards: MapHazard[] }>('/hazards?limit=100')
    .then((r) => setHazards(r.hazards))
    .catch((e) => notify(e instanceof Error ? e.message : 'Could not load hazards.'));

  useEffect(() => {
    if (!rideId) return undefined;
    loadHazards();
    const startTime = Date.parse(localStorage.getItem('saferoute_active_ride_start_time') || '');
    const tick = () => { if (!Number.isNaN(startTime)) setSecondsElapsed(Math.max(0, Math.floor((Date.now() - startTime) / 1000))); };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [rideId]);

  // Keep the screen on during a ride; a sleeping screen pauses GPS and motion sensors.
  // The browser drops the lock when the tab is hidden, so take it again on return.
  useEffect(() => {
    if (!rideId || !('wakeLock' in navigator)) return undefined;
    let lock: WakeLockSentinel | null = null;
    const acquire = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.wakeLock.request('screen').then((l) => { lock = l; }).catch(() => undefined);
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => { document.removeEventListener('visibilitychange', acquire); lock?.release().catch(() => undefined); };
  }, [rideId]);

  // Live GPS: position, speed, recorded track, current road name.
  useEffect(() => {
    if (!rideId) return undefined;
    if (!navigator.geolocation) { setGpsError('This browser has no GPS access.'); return undefined; }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const here = { lat: p.coords.latitude, lng: p.coords.longitude };
        setGpsError('');
        setPos(here);
        posRef.current = here;
        const kmh = p.coords.speed != null ? p.coords.speed * 3.6 : null;
        setSpeedKmh(kmh);
        speedRef.current = p.coords.speed;
        setTrack((t) => {
          if (t.length && distanceM(t[t.length - 1], here) < 5) return t; // ignore GPS jitter
          const next = [...t, here];
          localStorage.setItem(TRACK_KEY, JSON.stringify(next));
          return next;
        });
        const last = lastGeocode.current;
        if (!last || (Date.now() - last.at > 30000 && distanceM(last.p, here) > 100)) {
          lastGeocode.current = { at: Date.now(), p: here };
          reverseGeocode(here).then((place) => setRoad(place.roadName || place.area));
        }
      },
      () => setGpsError('Allow location access to track this ride.'),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [rideId]);

  const route = plan?.routes[plan.selected]?.path || null;
  const openHazards = hazards.filter((h) => h.status !== 'resolved');

  // Nearest open hazard on the planned route (or anywhere within 1 km on a free ride).
  const nextHazard = useMemo(() => {
    if (!pos) return null;
    const candidates = openHazards
      .filter((h) => !passed.includes(h._id) && (!route || distanceToLineM(hazardPoint(h), route) <= 40))
      .map((h) => ({ h, d: distanceM(pos, hazardPoint(h)) }))
      .filter(({ d }) => d <= 1000)
      .sort((a, b) => a.d - b.d);
    return candidates[0] || null;
  }, [pos, hazards, passed, route]);

  // Warn once per hazard, and count it as passed when we get close.
  useEffect(() => {
    if (!nextHazard) return;
    const { h, d } = nextHazard;
    const name = h.hazardType.replaceAll('_', ' ');
    if (d <= WARN_M && !announced.current.has(h._id)) {
      announced.current.add(h._id);
      if (voiceActive) speak(`Caution. ${h.severity} severity ${name} in ${Math.round(d / 10) * 10} metres.`);
      notify(`${name} ahead in ${Math.round(d)} m`, `${h.severity} severity, reported by riders.`);
    }
    if (d <= PASSED_M) setPassed((list) => (list.includes(h._id) ? list : [...list, h._id]));
  }, [nextHazard, voiceActive]);

  // Auto-detect: 2-second motion windows go to the ML model when there is a jolt.
  const startSensors = async () => {
    if (typeof DeviceMotionEvent === 'undefined') { setSensorState('unsupported'); return; }
    const ctor = DeviceMotionEvent as unknown as MotionPermission;
    if (ctor.requestPermission) {
      try {
        if ((await ctor.requestPermission()) !== 'granted') { setSensorState('needs-permission'); return; }
      } catch { setSensorState('needs-permission'); return; }
    }
    setSensorState('on');
  };

  useEffect(() => {
    if (!rideId || localStorage.getItem(AUTODETECT_KEY) === 'false') return;
    const ctor = typeof DeviceMotionEvent === 'undefined' ? null : (DeviceMotionEvent as unknown as MotionPermission);
    if (!ctor) setSensorState('unsupported');
    else if (ctor.requestPermission) setSensorState('needs-permission'); // iOS: needs a tap
    else setSensorState('on');
  }, [rideId]);

  useEffect(() => {
    if (sensorState !== 'on') return undefined;
    let samples: MotionSample[] = [];
    let startedAt = Date.now();
    let seq = 0;
    const onMotion = (e: DeviceMotionEvent) => { const s = sampleFromEvent(e); if (s) samples.push(s); };
    window.addEventListener('devicemotion', onMotion);
    const timer = window.setInterval(() => {
      const batch = samples; const from = startedAt;
      samples = []; startedAt = Date.now();
      const here = posRef.current;
      if (batch.length < 20 || !here) return;
      const summary = summarizeWindow(batch, (Date.now() - from) / 1000);
      if (summary.accel.magnitude.max < 2.5) return; // smooth road: skip the network call
      seq += 1;
      apiRequest<{ createdHazard: boolean; prediction: { label: string; confidence: number } }>('/ml/hazard', {
        method: 'POST',
        body: {
          window: {
            schemaVersion: 2, windowId: `${rideId}-${seq}`, rideId, seq,
            startedAt: new Date(from).toISOString(), endedAt: new Date().toISOString(), durationMs: Date.now() - from,
            gps: { lat: here.lat, lng: here.lng, speedMps: speedRef.current ?? undefined },
            ...summary,
          },
        },
      }).then((r) => {
        if (!r.createdHazard) return;
        setMlDetections((n) => n + 1);
        notify(`Auto-detected ${r.prediction.label.replaceAll('_', ' ')}`, `Saved at ${(r.prediction.confidence * 100).toFixed(0)}% confidence.`);
        loadHazards();
      }).catch(() => undefined);
    }, 2000);
    return () => { window.removeEventListener('devicemotion', onMotion); window.clearInterval(timer); };
  }, [sensorState, rideId]);

  const quickTag = async (tag: typeof QUICK_TAGS[number]) => {
    const here = posRef.current;
    if (!here) { notify('Waiting for GPS', 'Your location is needed to pin the hazard.'); return; }
    try {
      const place = await reverseGeocode(here);
      await apiRequest('/hazards', {
        method: 'POST',
        body: {
          hazardType: tag.type,
          severity: 'medium',
          description: `${tag.label} tagged during a ride.`,
          location: { type: 'Point', coordinates: [here.lng, here.lat] },
          ...place,
          source: 'manual',
        },
      });
      const count = Number(localStorage.getItem('saferoute_active_ride_reports') || 0) + 1;
      localStorage.setItem('saferoute_active_ride_reports', String(count));
      notify(`${tag.label} saved`, place.roadName ? `On ${place.roadName}.` : 'At your current location.');
      loadHazards();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not save the hazard.');
    }
  };

  const reroute = () => {
    if (!plan || plan.routes.length < 2) { notify('No other route', 'Search again from Start Ride to get alternatives.'); return; }
    const next = { ...plan, selected: (plan.selected + 1) % plan.routes.length };
    setPlan(next);
    localStorage.setItem(PLAN_KEY, JSON.stringify(next));
    const r = next.routes[next.selected];
    notify(`Switched to ${next.selected === 0 ? 'safest route' : `alternative ${next.selected}`}`, `${r.distanceKm.toFixed(1)} km, ${r.hazardCount} hazards on route.`);
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      if (!rideId) throw new Error('No active ride session was found. Start a new ride first.');
      // Keep at most 5000 points (server limit) by taking every nth point.
      const step = Math.ceil(track.length / 5000) || 1;
      await apiRequest(`/rides/${rideId}`, {
        method: 'PATCH',
        body: {
          distanceKm: Math.round(pathLengthKm(track) * 100) / 100,
          durationMinutes: Math.round(secondsElapsed / 60),
          hazardsDetectedCount: passed.length + mlDetections,
          hazardsReportedCount: Number(localStorage.getItem('saferoute_active_ride_reports') || 0),
          safetyScore: Math.max(0, 100 - passed.length * 10),
          // Profile setting "Save ride GPS tracks" off: keep totals, drop the path.
          route: user?.preferences?.anonymousTelemetry === false ? [] : track.filter((_, i) => i % step === 0),
        },
      });
      localStorage.setItem('saferoute_summary_ride_id', rideId);
      ['saferoute_active_ride_id', 'saferoute_active_ride_start_time', 'saferoute_active_ride_reports', PLAN_KEY, TRACK_KEY, AUTODETECT_KEY]
        .forEach((key) => localStorage.removeItem(key));
      navigate('/ride/summary');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to save this ride.', 'Check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!rideId) {
    return (
      <div className="min-h-screen flex flex-col bg-surface">
        <AppHeader title="Active Ride" variant="main" />
        <main className="flex-1 grid place-items-center p-6 text-center">
          <div>
            <p className="font-bold text-primary text-lg">No ride in progress</p>
            <p className="text-sm text-secondary mt-1">Start a ride to track distance, speed and hazards.</p>
            <button onClick={() => navigate('/ride/start')} className="mt-4 rounded-xl bg-primary text-on-primary px-5 py-3 font-semibold cursor-pointer">Go to Start Ride</button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const mins = Math.floor(secondsElapsed / 60);
  const secs = secondsElapsed % 60;
  const km = pathLengthKm(track);
  const btn = 'cursor-pointer active:scale-95 transition-transform';

  return (
    <div className="bg-surface min-h-screen flex flex-col">
      <AppHeader title="Active Ride" variant="main" />
      <main className="flex-1 flex flex-col w-full pt-16 pb-24 max-w-lg mx-auto">
        {/* Next-hazard cue */}
        <div className="m-3 rounded-2xl bg-primary text-on-primary p-3 flex items-center gap-3 shadow">
          <span className="material-symbols-outlined text-3xl">{nextHazard ? 'warning' : 'verified_user'}</span>
          <div className="min-w-0">
            <p className="font-extrabold text-lg leading-tight">
              {nextHazard ? `${nextHazard.h.hazardType.replaceAll('_', ' ')} in ${Math.round(nextHazard.d)} m` : 'No reported hazards ahead'}
            </p>
            <p className="text-xs text-primary-fixed truncate">
              {gpsError || (nextHazard ? `${nextHazard.h.severity} severity · ${nextHazard.h.description}` : plan?.destination ? `Heading to ${plan.destination}` : 'Free ride')}
            </p>
          </div>
        </div>

        {/* Live metrics */}
        <div className="mx-3 mb-3 grid grid-cols-4 rounded-2xl bg-surface-container-low p-2 text-center">
          {[
            ['Distance', `${km.toFixed(2)} km`],
            ['Time', `${mins}:${String(secs).padStart(2, '0')}`],
            ['Hazards', String(passed.length + mlDetections)],
            ['Speed', speedKmh == null ? '—' : `${Math.round(speedKmh)} km/h`],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[11px] text-secondary font-semibold">{label}</p>
              <p className="font-bold text-on-surface">{value}</p>
            </div>
          ))}
        </div>

        <HazardMap
          center={pos || BENGALURU}
          user={pos}
          hazards={hazards}
          paths={[...(route ? [{ points: route, color: '#0369a1', width: 6, dashed: true }] : []), { points: track, color: '#dd9202', width: 5 }]}
          className="h-[360px]"
          initialZoom={16}
          onRecenter={() => { if (!posRef.current) notify('Waiting for GPS', 'Allow location access to follow your position.'); }}
        >
          {road && <div className="absolute left-3 top-3 z-10 rounded-xl bg-white/95 px-3 py-1.5 text-xs font-semibold shadow">On {road}</div>}
          <button
            aria-label="Report a hazard with details"
            onClick={() => navigate('/report')}
            className={`absolute left-3 bottom-8 z-10 w-14 h-14 rounded-full bg-on-tertiary-container text-white shadow-xl flex flex-col items-center justify-center ${btn}`}
          >
            <span className="material-symbols-outlined">add_alert</span>
            <span className="text-[9px] font-bold">Report</span>
          </button>
        </HazardMap>

        <div className="m-3 flex flex-col gap-2.5">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {QUICK_TAGS.map((tag) => (
              <button key={tag.type} onClick={() => quickTag(tag)} className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-high text-xs font-semibold ${btn}`}>
                <span className="material-symbols-outlined text-sm">{tag.icon}</span>{tag.label}
              </button>
            ))}
          </div>

          {sensorState === 'needs-permission' && (
            <button onClick={startSensors} className={`rounded-xl bg-secondary-container px-3 py-2 text-sm font-semibold ${btn}`}>Allow motion sensors for auto-detect</button>
          )}
          <p className="text-[11px] text-secondary">
            Auto-detect: {sensorState === 'on' ? `listening (${mlDetections} found)` : sensorState === 'unsupported' ? 'this device has no motion sensors' : sensorState === 'needs-permission' ? 'waiting for permission' : 'off for this ride'}
          </p>

          <div className="flex gap-2.5">
            <button
              aria-label={voiceActive ? 'Turn voice alerts off' : 'Turn voice alerts on'}
              aria-pressed={voiceActive}
              onClick={() => { const next = !voiceActive; setVoiceActive(next); if (next) speak('Voice alerts on.'); }}
              className={`h-12 px-3.5 rounded-xl bg-surface-container flex items-center gap-2 ${btn} ${voiceActive ? '' : 'opacity-60'}`}
            >
              <span className="material-symbols-outlined">{voiceActive ? 'record_voice_over' : 'voice_over_off'}</span>
              <span className="text-xs font-bold">{voiceActive ? 'Voice on' : 'Voice off'}</span>
            </button>
            <button aria-label="Switch to another route" onClick={reroute} className={`h-12 w-12 rounded-xl bg-secondary-container flex items-center justify-center ${btn}`}>
              <span className="material-symbols-outlined">alt_route</span>
            </button>
            <button onClick={() => setIsModalOpen(true)} className={`flex-1 h-12 rounded-xl bg-error text-on-error font-bold flex items-center justify-center gap-2 ${btn}`}>
              <span className="material-symbols-outlined">stop_circle</span>End & save ride
            </button>
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-[60] bg-primary/70 flex items-end justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="end-ride-title">
            <div className="w-full max-w-lg bg-surface-container-lowest rounded-3xl p-5 flex flex-col gap-4">
              <div>
                <h3 id="end-ride-title" className="font-bold text-on-surface">Finish ride and save?</h3>
                <p className="text-sm text-secondary">{km.toFixed(2)} km in {mins} min, {passed.length + mlDetections} hazards passed or detected.</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button onClick={() => setIsModalOpen(false)} className={`h-12 rounded-xl bg-surface-container-high font-semibold ${btn}`}>Keep riding</button>
                <button onClick={handleConfirmSave} disabled={isSaving} className={`h-12 rounded-xl bg-error text-on-error font-bold disabled:opacity-70 ${btn}`}>
                  {isSaving ? 'Saving…' : 'Save & finish'}
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div role="status" className="fixed top-20 inset-x-4 z-[60] mx-auto max-w-md rounded-2xl bg-on-secondary-fixed text-white p-3 shadow-2xl">
            <p className="text-sm font-bold capitalize">{toast.title}</p>
            {toast.sub && <p className="text-xs opacity-80">{toast.sub}</p>}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
