import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader.tsx';
import BottomNav from '../components/BottomNav.tsx';
import Toast from '../components/Toast.tsx';
import HazardMap, { type MapHazard } from '../components/HazardMap.tsx';
import { apiRequest } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { BENGALURU, fetchRoutes, geocode, getPosition, type LatLng } from '../lib/geo';
import { AUTODETECT_KEY, PLAN_KEY, countOnRoute, type PlannedRoute, type RidePlan } from '../lib/ridePlan';

export default function StartRideScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [origin, setOrigin] = useState<LatLng>(BENGALURU);
  const [hasGps, setHasGps] = useState(false);
  const [destination, setDestination] = useState('');
  const [routes, setRoutes] = useState<PlannedRoute[]>([]);
  const [selected, setSelected] = useState(0);
  const [hazards, setHazards] = useState<MapHazard[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [autoDetect, setAutoDetect] = useState(user?.preferences?.autoDetect ?? true);
  const [toastMessage, setToastMessage] = useState('');
  const [isToastOpen, setIsToastOpen] = useState(false);

  const showToast = (msg: string) => { setToastMessage(msg); setIsToastOpen(true); };

  const locate = () => getPosition()
    .then((p) => { setOrigin({ lat: p.coords.latitude, lng: p.coords.longitude }); setHasGps(true); })
    .catch((e) => { setHasGps(false); showToast(`${e.message} Using central Bengaluru as the start.`); });

  useEffect(() => {
    locate();
    apiRequest<{ hazards: MapHazard[] }>('/hazards?limit=100')
      .then((r) => setHazards(r.hazards))
      .catch((e) => showToast(e instanceof Error ? e.message : 'Could not load hazards.'));
  }, []);

  const findRoutes = async (place = destination) => {
    if (!place.trim()) { showToast('Type where you are going first.'); return; }
    setDestination(place);
    setIsSearching(true);
    try {
      const target = await geocode(place);
      const options = await fetchRoutes(origin, target);
      // Safest first: fewest open hazards near the line, then shortest time.
      const scored = options
        .map((r) => ({ ...r, hazardCount: countOnRoute(r.path, hazards) }))
        .sort((a, b) => a.hazardCount - b.hazardCount || a.durationMin - b.durationMin);
      setRoutes(scored);
      setSelected(0);
      showToast(`${scored.length} route${scored.length > 1 ? 's' : ''} to ${target.label}.`);
    } catch (e) {
      setRoutes([]);
      showToast(e instanceof Error ? e.message : 'Route search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleBeginRide = async () => {
    setIsStarting(true);
    try {
      const result = await apiRequest<{ id: string; ride: { startTime: string } }>('/rides', { method: 'POST', body: { destination } });
      localStorage.setItem('saferoute_active_ride_id', result.id);
      localStorage.setItem('saferoute_active_ride_start_time', result.ride.startTime);
      localStorage.setItem('saferoute_active_ride_reports', '0');
      localStorage.setItem(AUTODETECT_KEY, String(autoDetect));
      const plan: RidePlan = { destination, routes, selected };
      localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
      navigate('/ride/active');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not start ride.');
    } finally {
      setIsStarting(false);
    }
  };

  const paths = routes.map((r, i) => ({ points: r.path, color: i === selected ? '#0369a1' : '#94a3b8', width: i === selected ? 6 : 4, dashed: i !== selected }));
  // Draw the selected route last so it sits on top.
  const orderedPaths = [...paths.filter((_, i) => i !== selected), ...(paths[selected] ? [paths[selected]] : [])];

  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-screen flex flex-col">
      <AppHeader title="Start Ride" variant="main" />

      <main className="flex-1 flex flex-col w-full pt-16 pb-24 bg-surface max-w-lg mx-auto">
        <form
          className="m-3 rounded-2xl bg-surface-container-lowest shadow p-3 flex flex-col gap-2 border border-outline-variant/20"
          onSubmit={(e) => { e.preventDefault(); findRoutes(); }}
        >
          <label htmlFor="destination-input" className="text-xs font-semibold text-secondary">Where to in Bengaluru?</label>
          <div className="flex gap-2">
            <input
              id="destination-input"
              className="flex-1 rounded-xl bg-surface-container-low px-3 py-2 text-on-surface focus:outline-2 focus:outline-primary"
              placeholder="e.g. Indiranagar Metro"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
            {destination && (
              <button type="button" aria-label="Clear destination" onClick={() => { setDestination(''); setRoutes([]); }} className="w-10 rounded-xl bg-surface-container-high cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
            <button type="submit" disabled={isSearching} className="rounded-xl bg-primary text-on-primary px-4 font-semibold cursor-pointer disabled:opacity-60">
              {isSearching ? 'Finding…' : 'Find routes'}
            </button>
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {['Indiranagar Metro', 'RMZ Ecoworld', 'Koramangala 4th Block'].map((tag) => (
              <button key={tag} type="button" onClick={() => findRoutes(tag)} className="shrink-0 px-2.5 py-1 rounded-full bg-surface-container text-xs cursor-pointer">
                {tag}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-secondary">
            {hasGps ? 'Starting from your current location.' : 'Location off: starting from central Bengaluru. Use the locate button on the map to retry.'}
          </p>
        </form>

        <HazardMap center={routes[selected] ? routes[selected].path[Math.floor(routes[selected].path.length / 2)] : origin}user={hasGps ? origin : null} hazards={hazards} paths={orderedPaths} className="h-[380px]" initialZoom={13} onRecenter={locate}>
          {routes[selected] && (
            <div className="absolute left-3 top-3 z-10 rounded-xl bg-white/95 px-3 py-2 shadow text-xs">
              <b className={routes[selected].hazardCount ? 'text-error' : 'text-emerald-700'}>{routes[selected].hazardCount}</b> reported hazards on this route
            </div>
          )}
        </HazardMap>

        <div className="m-3 flex flex-col gap-3">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low">
            <div>
              <p className="font-semibold text-on-surface">Auto-detect hazards</p>
              <p className="text-xs text-secondary">Uses your phone's motion sensors and the ML model to log potholes and bumps.</p>
            </div>
            <button
              role="switch"
              aria-checked={autoDetect}
              aria-label="Auto-detect hazards"
              onClick={() => setAutoDetect((v) => !v)}
              className={`relative w-12 h-7 rounded-full shrink-0 cursor-pointer ${autoDetect ? 'bg-tertiary-fixed-dim' : 'bg-surface-container-highest'}`}
              type="button"
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${autoDetect ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          {routes.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(i)}
              aria-pressed={i === selected}
              className={`w-full p-3 rounded-2xl flex items-center justify-between text-left cursor-pointer ${i === selected ? 'bg-secondary-container/50 ring-2 ring-primary/30' : 'bg-surface-container-low'}`}
            >
              <div>
                <p className="font-bold text-primary">{routes.length === 1 ? 'Best available route' : i === 0 ? 'Safest route' : `Alternative ${i}`}</p>
                <p className={`text-xs ${r.hazardCount ? 'text-error' : 'text-emerald-700'}`}>
                  {r.distanceKm.toFixed(1)} km • {r.hazardCount} reported hazard{r.hazardCount === 1 ? '' : 's'} on route
                </p>
              </div>
              <span className="font-bold text-on-surface">{r.durationMin} min</span>
            </button>
          ))}
          {!routes.length && <p className="text-sm text-secondary px-1">Search a destination to compare routes, or begin a free ride without one.</p>}

          <button
            onClick={handleBeginRide}
            disabled={isStarting}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-tertiary-fixed-dim to-[#ff7a00] text-on-tertiary-fixed flex items-center justify-center gap-2 font-bold cursor-pointer disabled:opacity-70"
            type="button"
          >
            <span className={`material-symbols-outlined ${isStarting ? 'animate-spin' : ''}`}>{isStarting ? 'sync' : 'navigation'}</span>
            {isStarting ? 'Starting…' : routes.length ? 'Begin ride on selected route' : 'Begin free ride'}
          </button>
        </div>
      </main>

      <BottomNav />
      <Toast message={toastMessage} icon="check_circle" isOpen={isToastOpen} onClose={() => setIsToastOpen(false)} />
    </div>
  );
}
