import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader.tsx';
import BottomNav from '../components/BottomNav.tsx';
import Toast from '../components/Toast.tsx';

export default function StartRideScreen() {
  const navigate = useNavigate();
  const [destination, setDestination] = useState('Indiranagar 100ft Road');
  const [isHazardDetectionOn, setIsHazardDetectionOn] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<'safe' | 'direct'>('safe');
  const [isStarting, setIsStarting] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showLayersToast, setShowLayersToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isToastOpen, setIsToastOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setIsToastOpen(true);
  };

  const handleQuickTag = (tag: string) => {
    setDestination(tag);
    showToast(`Route updated to ${tag}`);
  };

  const handleBeginRide = () => {
    setIsStarting(true);
    showToast(`Locking optimal safe corridor to ${destination}...`);
    setTimeout(() => {
      setIsStarting(false);
      navigate('/ride/active');
    }, 800);
  };

  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-secondary-container">
      {/* Header title FIXED to "Start Ride" */}
      <AppHeader title="Start Ride" variant="main" />

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-24 bg-surface max-w-lg mx-auto">
        <div className="flex flex-col w-full relative">
          {/* Map View Container with Dynamic Overlays */}
          <div className="relative w-full h-[640px] overflow-hidden select-none">
            {/* Map Background Placeholder */}
            <img
              alt="Vector satellite commuter map of Bengaluru"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300"
              style={{ transform: `scale(${zoomLevel})` }}
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCkQn24Yq39Va8vQSjVnHMO6U-0SAdgVy5C_YcEPgB1h4et5NjM3jF7KoK5sTr7SdTqgkVT5nE3K5_etTIinj9tsqg7qi1PWPQuW_sP8FUe1lbAmJNm7ga3-0NiX7QjeTpQUKiYDx0uMcKQDUaePLjRMnZjLYEgfaRIQDcZ8vAAqJx2oUQxNuLOWQUcVBtk-8C8OLUWRMpAuwgAR-ifE0lf4VjBHIae9hn5BSPaQwtatX7TyG4ATNff"
            />

            {/* Ambient Map Vignette Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-transparent to-primary/80 pointer-events-none"></div>

            {/* Active Route Vector Graphics */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              fill="none"
              viewBox="0 0 400 640"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Glow Underlay for Route */}
              <path
                className="opacity-30 blur-sm"
                d="M200 440 L200 240 L160 210 L160 145"
                stroke="#3b82f6"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="10"
              />
              {/* Selected Safe Primary Path */}
              <path
                d="M200 440 L200 240 L160 210 L160 145"
                id="safe-route-path"
                stroke={selectedRoute === 'safe' ? '#00d2ff' : '#64748b'}
                strokeDasharray="8 6"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={selectedRoute === 'safe' ? '6' : '3.5'}
              />
              {/* Alternative Hazardous Direct Path */}
              <path
                d="M200 440 L245 320 L220 180 L160 145"
                stroke={selectedRoute === 'direct' ? '#f43f5e' : '#f43f5e88'}
                strokeDasharray="4 4"
                strokeLinecap="round"
                strokeWidth={selectedRoute === 'direct' ? '6' : '3.5'}
              />
              {/* Hazard Spot Indicators along roads */}
              <circle className="animate-ping" cx="230" cy="300" fill="#f43f5e" fillOpacity="0.25" r="14" />
              <circle cx="230" cy="300" fill="#ba1a1a" r="7" />
              <circle className="animate-pulse" cx="185" cy="330" fill="#ffb955" fillOpacity="0.2" r="12" />
              <circle cx="185" cy="330" fill="#503200" r="5" />

              {/* User Current Location Pulse Anchor */}
              <circle className="animate-ping" cx="200" cy="440" fill="#d8e2ff" fillOpacity="0.4" r="22" />
              <circle cx="200" cy="440" fill="#1f3864" r="14" />
              <circle cx="200" cy="440" fill="#ffffff" r="7" />
              <polygon fill="#03224d" points="200,432 205,444 200,441 195,444" />
            </svg>

            {/* Top HUD Floating Layer */}
            <div className="absolute top-0 inset-x-0 p-space-md flex flex-col gap-space-sm z-20">
              {/* Search Box Shell (Glassmorphic) */}
              <div className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(3,34,77,0.12)] p-space-sm flex flex-col gap-space-xs border border-outline-variant/20">
                <div className="flex items-center gap-space-sm px-space-xs">
                  <div className="w-9 h-9 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-[20px]">search</span>
                  </div>
                  <input
                    className="w-full bg-transparent font-headline-sm text-headline-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none truncate"
                    id="destination-input"
                    placeholder="Where to in Bengaluru?"
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                  {destination && (
                    <button
                      aria-label="Clear destination"
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant active:scale-95 transition-transform cursor-pointer"
                      id="clear-btn"
                      onClick={() => setDestination('')}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>

                {/* Recent Quick Filter Tags */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
                  {['Indiranagar Metro', 'RMZ Ecoworld', 'Koramangala 4th Block'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleQuickTag(tag)}
                      className="quick-tag shrink-0 px-2.5 py-1 rounded-full bg-surface-container text-on-secondary-fixed text-label-sm font-label-sm flex items-center gap-1 active:bg-secondary-container transition-colors cursor-pointer"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[13px] text-primary">
                        {tag.includes('Metro') ? 'history' : tag.includes('Ecoworld') ? 'domain' : 'storefront'}
                      </span>
                      <span>{tag}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* High-Accuracy GPS Precision Tag */}
              <div className="self-start flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/85 backdrop-blur-md text-on-primary shadow-sm border border-primary-fixed-dim/20">
                <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim animate-pulse"></span>
                <span className="material-symbols-outlined text-[13px] text-tertiary-fixed-dim">my_location</span>
                <span className="font-label-sm text-label-sm tracking-wide">100ft Rd, Indiranagar (±2m GPS locked)</span>
              </div>
            </div>

            {/* Map Floating Action Controls */}
            <div className="absolute right-margin bottom-20 flex flex-col gap-2 z-10">
              <button
                aria-label="Recenter map"
                onClick={() => {
                  setZoomLevel(1);
                  showToast('Map centered at Indiranagar 100ft Road');
                }}
                className="w-11 h-11 rounded-xl bg-surface-container-lowest/90 backdrop-blur-md shadow-md flex items-center justify-center text-primary active:scale-95 transition-transform cursor-pointer border border-outline-variant/10"
                id="recenter-btn"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">near_me</span>
              </button>

              <button
                aria-label="Toggle map hazard layers"
                onClick={() => showToast('BBMP Potholes & Live Traffic overlay active')}
                className="w-11 h-11 rounded-xl bg-surface-container-lowest/90 backdrop-blur-md shadow-md flex items-center justify-center text-primary active:scale-95 transition-transform cursor-pointer border border-outline-variant/10"
                id="layers-btn"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">layers</span>
              </button>

              <div className="flex flex-col rounded-xl bg-surface-container-lowest/90 backdrop-blur-md shadow-md overflow-hidden border border-outline-variant/10">
                <button
                  aria-label="Zoom in"
                  onClick={() => setZoomLevel((z) => Math.min(z + 0.15, 1.6))}
                  className="w-11 h-10 flex items-center justify-center text-primary active:bg-surface-container cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
                <div className="h-[1px] bg-outline-variant/30"></div>
                <button
                  aria-label="Zoom out"
                  onClick={() => setZoomLevel((z) => Math.max(z - 0.15, 0.85))}
                  className="w-11 h-10 flex items-center justify-center text-primary active:bg-surface-container cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">remove</span>
                </button>
              </div>
            </div>

            {/* Live Road Hazard Warning Floating Badge */}
            <div className="absolute left-margin bottom-20 z-10 max-w-[210px] p-2.5 rounded-xl bg-surface-container-lowest/95 backdrop-blur-md shadow-md flex items-center gap-2 border border-outline-variant/10">
              <div className="w-7 h-7 rounded-lg bg-error-container text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[16px]">report_problem</span>
              </div>
              <div className="min-w-0">
                <p className="font-label-sm text-label-sm text-on-surface truncate font-bold">Ring Rd Crater Ahead</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant truncate">Bypassed safely by AI</p>
              </div>
            </div>
          </div>

          {/* Prominent Deep Civic Bottom Card Deck */}
          <div className="relative -mt-12 z-30 w-full px-margin pb-space-lg flex flex-col gap-space-md">
            <div className="bg-surface-container-lowest rounded-3xl shadow-[0_-8px_32px_rgba(3,34,77,0.12)] p-space-md flex flex-col gap-space-md border border-outline-variant/10">
              <div className="w-12 h-1 rounded-full bg-surface-variant self-center mb-0.5"></div>

              {/* Card Header with Smart AI Shield */}
              <div className="flex items-center justify-between gap-space-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-[18px]">security</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-headline-sm text-headline-sm text-primary truncate leading-tight font-bold">
                      Safe Commute Route AI
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Real-time BBMP municipal crowd mesh
                    </span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm shrink-0 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                  Pothole-Bypassing Active
                </span>
              </div>

              {/* Autonomous Hazard Telemetry Switch Card */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed shrink-0">
                    <span className="material-symbols-outlined text-[20px]">sensors</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                      Auto-detect hazards
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                      Gyro & vibration AI telemetry enabled
                    </span>
                  </div>
                </div>

                {/* Tactile Toggle Switch */}
                <button
                  aria-checked={isHazardDetectionOn}
                  onClick={() => setIsHazardDetectionOn(!isHazardDetectionOn)}
                  className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer shrink-0 focus:outline-none ${
                    isHazardDetectionOn ? 'bg-tertiary-fixed-dim' : 'bg-surface-container-highest'
                  }`}
                  id="hazard-toggle"
                  role="switch"
                  type="button"
                >
                  <span className="sr-only">Toggle hazard detection telemetry</span>
                  <span
                    className={`absolute top-1 w-5 h-5 rounded-full bg-surface-container-lowest shadow-sm transition-all duration-200 ${
                      isHazardDetectionOn ? 'left-6' : 'left-1'
                    }`}
                    id="toggle-thumb"
                  ></span>
                </button>
              </div>

              {/* Route Selection Cards: Comparison Deck */}
              <div className="flex flex-col gap-2">
                {/* Route 1: Optimal & Smooth */}
                <button
                  onClick={() => setSelectedRoute('safe')}
                  className={`route-select-btn w-full p-3 rounded-2xl flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer ${
                    selectedRoute === 'safe'
                      ? 'bg-secondary-container/40 ring-2 ring-primary/20 shadow-sm'
                      : 'bg-surface-container-low opacity-80 hover:opacity-100'
                  }`}
                  id="route-opt-1"
                  type="button"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-label-lg text-label-lg font-bold text-primary">Fastest Safe</span>
                        <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-secondary-fixed text-label-sm font-label-sm font-semibold">
                          Recommended
                        </span>
                      </div>
                      <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        14.8 km • 32 min • 2 minor surface bumps
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-headline-sm text-headline-sm text-primary font-bold">32m</span>
                  </div>
                </button>

                {/* Route 2: Direct but Crater-Heavy */}
                <button
                  onClick={() => setSelectedRoute('direct')}
                  className={`route-select-btn w-full p-3 rounded-2xl flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer ${
                    selectedRoute === 'direct'
                      ? 'bg-secondary-container/40 ring-2 ring-error/30 shadow-sm'
                      : 'bg-surface-container-low opacity-80 hover:opacity-100'
                  }`}
                  id="route-opt-2"
                  type="button"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-error-container text-on-error-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[16px]">dangerous</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-label-lg text-label-lg font-semibold text-on-surface">Direct Outer Ring</span>
                        <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-label-sm font-label-sm font-bold">
                          High Risk
                        </span>
                      </div>
                      <span className="font-body-sm text-body-sm text-error mt-0.5 font-medium">
                        12.2 km • 28 min • 8 severe craters logged
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-headline-sm text-headline-sm text-on-surface font-medium">28m</span>
                  </div>
                </button>
              </div>

              {/* Massive Action CTA Button: Begin Ride -> /ride/active */}
              <button
                onClick={handleBeginRide}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-tertiary-fixed-dim via-on-tertiary-container to-[#ff7a00] text-on-tertiary-fixed flex items-center justify-center gap-space-sm shadow-[0_10px_24px_rgba(221,146,2,0.35)] active:scale-[0.98] transition-all cursor-pointer font-bold disabled:opacity-80"
                id="begin-ride-cta"
                type="button"
                disabled={isStarting}
              >
                <span
                  className={`material-symbols-outlined text-[24px] ${isStarting ? 'animate-spin' : ''}`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {isStarting ? 'sync' : 'navigation'}
                </span>
                <span className="font-label-lg text-label-lg font-bold tracking-wide uppercase">
                  {isStarting ? `Navigating to ${destination}...` : 'Begin Ride'}
                </span>
                {!isStarting && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-on-surface-variant">
                <span className="material-symbols-outlined text-[14px]">shield_with_heart</span>
                <span className="font-label-sm text-label-sm">Live crash & deep-pothole alerts will speak aloud</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
      <Toast message={toastMessage} icon="check_circle" isOpen={isToastOpen} onClose={() => setIsToastOpen(false)} />
    </div>
  );
}
