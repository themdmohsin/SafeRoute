import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader.tsx';
import BottomNav from '../components/BottomNav.tsx';
import Toast from '../components/Toast.tsx';
import AssistantChat from '../components/AssistantChat.tsx';
import { apiRequest } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

interface HomeHazard {
  _id: string;
  hazardType: string;
  severity: string;
  description: string;
  area?: string;
  roadName?: string;
  status: string;
}

export default function HomeScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('All');
  const [hazards, setHazards] = useState<HomeHazard[]>([]);
  const [hazardsError, setHazardsError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastIcon, setToastIcon] = useState('check_circle');
  const [isToastOpen, setIsToastOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams({ limit: '5', page: '1' });
    if (activeFilter === 'Deep Potholes') params.set('hazardType', 'pothole');
    if (activeFilter === 'Waterlogging') params.set('hazardType', 'waterlogging');
    if (activeFilter === 'Roadwork') params.set('hazardType', 'speed_breaker');
    apiRequest<{ hazards: HomeHazard[] }>(`/hazards?${params.toString()}`)
      .then(({ hazards: recent }) => { setHazards(recent); setHazardsError(''); })
      .catch((error) => setHazardsError(error instanceof Error ? error.message : 'Could not load hazards.'));
  }, [activeFilter]);

  const showToast = (msg: string, icon = 'check_circle') => {
    setToastMessage(msg);
    setToastIcon(icon);
    setIsToastOpen(true);
  };

  const handleInstantReport = async (type: string) => {
    const hazardType = type === 'Waterlog' ? 'waterlogging' : type === 'Open Manhole' ? 'open_manhole' : 'pothole';
    try {
      if (!navigator.geolocation) throw new Error('This browser does not provide device location.');
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('Allow location access to submit a quick report.')), { enableHighAccuracy: true, timeout: 10000 });
      });
      await apiRequest('/hazards', {
        method: 'POST',
        body: {
          hazardType,
          description: `Quick ${type} report near 12th Main junction.`,
          location: { type: 'Point', coordinates: [position.coords.longitude, position.coords.latitude] },
          roadName: 'Device location',
          area: 'Bengaluru',
          source: 'manual',
        },
      });
      showToast(`Instant ${type} report saved.`, 'pin_drop');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not save quick report.', 'error');
    }
  };

  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-secondary-container">
      <AppHeader title="Home" variant="main" />

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-24 bg-surface max-w-lg mx-auto">
        <div className="flex flex-col w-full px-margin pb-6 gap-space-lg">
          {/* Top Greeting & Live Location Context */}
          <div className="flex flex-col gap-space-xs pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary tracking-tight font-bold">
                  Hi, {user?.name?.split(' ')[0] || 'Commuter'} ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ¢â‚¬Â¹
                </h1>
              </div>
              <button
                aria-label="Quick alerts"
                onClick={() => showToast('Road notifications are not connected yet.', 'notifications')}
                className="relative w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary active:scale-95 transition-transform cursor-pointer border border-outline-variant/10"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
              </button>
            </div>

            {/* Active Street GPS Pill */}
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-surface-container-low shadow-sm border border-outline-variant/10">
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-7 h-7 rounded-lg bg-primary-container text-tertiary-fixed-dim flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">near_me</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-label-md text-on-surface truncate font-semibold">
                    Example area: Indiranagar
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Location tracking is not connected</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => showToast('Location tracking is not connected yet.', 'my_location')}
                className="text-surface-tint hover:text-primary transition-colors flex items-center shrink-0 p-1 cursor-pointer"
                title="Recalibrate GPS"
              >
                <span className="material-symbols-outlined text-[20px]">my_location</span>
              </button>
            </div>
          </div>

          {/* Hero Start Ride Action Card (Main Civic CTA) */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-container to-primary text-on-primary p-space-lg shadow-xl shadow-primary-container/20">
            <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-tertiary-fixed-dim/20 blur-2xl pointer-events-none"></div>
            <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-primary-fixed-dim/15 blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col gap-space-md">
              <div className="flex items-start justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tertiary-fixed-dim/20 backdrop-blur-md text-tertiary-fixed-dim font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-[14px]">sensors</span>
                  SafeRoute hazard reports
                </span>
                <div className="w-10 h-10 rounded-2xl bg-surface-container-lowest/10 backdrop-blur-md flex items-center justify-center text-tertiary-fixed-dim">
                  <span className="material-symbols-outlined text-[24px]">route</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <h2 className="font-display text-2xl font-bold tracking-tight text-on-primary">
                  Safe Commute Mode
                </h2>
                <p className="font-body-sm text-body-sm text-on-primary-container leading-relaxed">
                  Review recent community reports. Automatic vehicle detection and turn-by-turn guidance are not connected.
                </p>
              </div>

              {/* Tactile Master Navigation Button -> /ride/start */}
              <button
                id="start-navigation-ride-btn"
                onClick={() => navigate('/ride/start')}
                className="w-full h-14 rounded-2xl bg-tertiary-fixed-dim hover:bg-tertiary-fixed text-on-tertiary-fixed font-headline-sm text-headline-sm flex items-center justify-center gap-2.5 shadow-[0_6px_20px_rgba(255,185,85,0.4)] active:scale-[0.98] transition-all cursor-pointer font-bold"
              >
                <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  play_circle
                </span>
                <span>Start Navigation Ride</span>
              </button>
            </div>
          </div>

          {/* Section: Recent Recent Hazard Reports */}
          <div className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Recent Hazard Reports</h3>
                <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-semibold">
                  {hazards.length} loaded
                </span>
              </div>
              <button
                onClick={() => navigate('/ride/start')}
                className="font-label-sm text-label-sm text-surface-tint font-semibold hover:underline cursor-pointer"
              >
                View Map
              </button>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-margin px-margin no-scrollbar">
              {['All', 'Deep Potholes', 'Waterlogging', 'Roadwork'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-1.5 rounded-full font-label-md text-label-md shrink-0 transition-colors cursor-pointer shadow-sm ${
                    activeFilter === filter
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Hazard Incident Cards */}
            <div className="flex flex-col gap-space-sm">
              {hazardsError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{hazardsError}</p>}
              {!hazardsError && hazards.length === 0 && <p className="rounded-xl bg-surface-container-low p-3 text-sm text-secondary">No matching hazard reports yet.</p>}
              {hazards.map((hazard) => (
                <article key={hazard._id} className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm border border-outline-variant/10">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">{hazard.severity} Ãƒâ€šÃ‚Â· {hazard.hazardType.replaceAll('_', ' ')}</span>
                    <span className="text-xs capitalize text-secondary">{hazard.status}</span>
                  </div>
                  <h4 className="mt-2 font-semibold text-on-surface">{[hazard.roadName, hazard.area].filter(Boolean).join(', ') || 'Road location'}</h4>
                  <p className="mt-1 text-sm text-on-surface-variant">{hazard.description}</p>
                </article>
              ))}

            </div>
          </div>

          {/* Specialized Quick-Swipe Civic Reporting Dock */}
          <div className="flex flex-col gap-space-sm pt-2">
            <div className="flex items-center justify-between">
              <span className="font-label-lg text-label-lg text-primary flex items-center gap-1.5 font-bold">
                <span className="material-symbols-outlined text-[18px] text-tertiary-fixed-dim">bolt</span>
                Instant Civic Reporting
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Tap once to pin</span>
            </div>

            {/* Rapid Incident Pills */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleInstantReport('Pothole')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-surface-container hover:bg-surface-container-high text-primary active:scale-95 transition-transform gap-1 cursor-pointer border border-outline-variant/10"
              >
                <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-sm text-error">
                  <span className="material-symbols-outlined text-[20px]">circle</span>
                </div>
                <span className="font-label-sm text-label-sm font-bold mt-0.5">Pothole</span>
                <span className="font-body-sm text-[10px] text-on-surface-variant leading-none">Location requested on submit</span>
              </button>

              <button
                onClick={() => handleInstantReport('Waterlog')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-surface-container hover:bg-surface-container-high text-primary active:scale-95 transition-transform gap-1 cursor-pointer border border-outline-variant/10"
              >
                <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-sm text-tertiary-container">
                  <span className="material-symbols-outlined text-[20px]">water_damage</span>
                </div>
                <span className="font-label-sm text-label-sm font-bold mt-0.5">Waterlog</span>
                <span className="font-body-sm text-[10px] text-on-surface-variant leading-none">Monsoon Tag</span>
              </button>

              <button
                onClick={() => handleInstantReport('Open Manhole')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-surface-container hover:bg-surface-container-high text-primary active:scale-95 transition-transform gap-1 cursor-pointer border border-outline-variant/10"
              >
                <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-sm text-surface-tint">
                  <span className="material-symbols-outlined text-[20px]">construction</span>
                </div>
                <span className="font-label-sm text-label-sm font-bold mt-0.5">Manhole</span>
                <span className="font-body-sm text-[10px] text-on-surface-variant leading-none">Open Lid</span>
              </button>
            </div>
          </div>

          {/* Current report count from the API response */}
          <div className="rounded-2xl bg-secondary-container/40 p-3.5 flex items-center justify-between gap-3 mt-1 border border-outline-variant/10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">diversity_3</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md text-on-secondary-container font-semibold truncate">
                  Recent reports
                </span>
                <span className="font-body-sm text-body-sm text-secondary truncate">
                  {hazards.length} matching reports loaded from SafeRoute.
                </span>
              </div>
              </div>
            </div>
          </div>      </main>

      <AssistantChat />
      <BottomNav />
      <Toast message={toastMessage} icon={toastIcon} isOpen={isToastOpen} onClose={() => setIsToastOpen(false)} />
    </div>
  );
}
