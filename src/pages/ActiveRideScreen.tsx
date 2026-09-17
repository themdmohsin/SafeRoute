import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader.tsx';
import BottomNav from '../components/BottomNav.tsx';
import Toast from '../components/Toast.tsx';

export default function ActiveRideScreen() {
  const navigate = useNavigate();

  // Active simulated telemetry
  const [secondsElapsed, setSecondsElapsed] = useState(860); // Starts at 14:20
  const [currentSpeed, setCurrentSpeed] = useState(34);
  const [voiceActive, setVoiceActive] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [toastMessage, setToastMessage] = useState('');
  const [toastSubtitle, setToastSubtitle] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((s) => s + 1);
      // Small realistic speed jitter (32 - 36 km/h)
      setCurrentSpeed(34 + Math.floor(Math.sin(Date.now() / 1000) * 3));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const triggerQuickTag = (type: string) => {
    setToastMessage(`Hazard Pinned to BBMP Grid: ${type}`);
    setToastSubtitle('Geo-tagged at Koramangala 80ft Road');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleConfirmSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsModalOpen(false);
      navigate('/ride/summary');
    }, 800);
  };

  return (
    <div className="bg-primary-container text-surface pt-safe pb-safe antialiased min-h-screen flex flex-col selection:bg-secondary-container">
      {/* Header title FIXED to "Active Ride" */}
      <AppHeader title="Active Ride" variant="main" />

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-24 bg-surface max-w-lg mx-auto">
        <div className="flex flex-col w-full relative select-none overflow-hidden pb-6">
          {/* Map Engine Canvas Simulation */}
          <div className="relative w-full h-[760px] overflow-hidden rounded-3xl bg-primary shadow-2xl">
            {/* Map Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center scale-105 transition-transform duration-1000"
              style={{
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDXgDlUFV5WTGlv91RTRsiJpkSqInVjAsgVzn-PflvT2Cu5NSzmCJUurc_zfSos2YcxVbB36bbx--K050vRePXW1wNFr50XsoPIo1GidYWnjcjhTih0u9pnH2Y-o9loO5-J_k3GJ_YhIjQoqO-XP_NI7SP3aXJ3iKcVSbIkti-94K4LEnkAKzJyEvjzeO7hq30sUDzB6V6CXtk1EJSL08bni0Vx1pqlRCeJG8DHfof_mHd97aS6gybJ')`,
              }}
            ></div>

            {/* Map Glow Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-transparent to-primary/90 pointer-events-none"></div>

            {/* SVG Navigation Path & Dynamic Guidance */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              fill="none"
              viewBox="0 0 400 760"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <filter height="140%" id="glow" width="140%" x="-20%" y="-20%">
                  <feGaussianBlur result="blur" stdDeviation="6"></feGaussianBlur>
                  <feMerge>
                    <feMergeNode in="blur"></feMergeNode>
                    <feMergeNode in="SourceGraphic"></feMergeNode>
                  </feMerge>
                </filter>
                <linearGradient id="routeGradient" x1="0" x2="0" y1="1" y2="0">
                  <stop offset="0%" stopColor="#dd9202"></stop>
                  <stop offset="50%" stopColor="#ffb955"></stop>
                  <stop offset="100%" stopColor="#d8e2ff"></stop>
                </linearGradient>
              </defs>

              {/* Outer Pulse Path */}
              <path
                d="M 200 660 L 205 530 L 235 410 L 220 310 L 150 250 L 140 180"
                stroke="#dd9202"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity="0.35"
                strokeWidth="12"
              ></path>

              {/* Core Active Glowing Polyline */}
              <path
                d="M 200 660 L 205 530 L 235 410 L 220 310 L 150 250 L 140 180"
                filter="url(#glow)"
                stroke="url(#routeGradient)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="6"
              ></path>

              {/* Animated Direction Dashes */}
              <path
                d="M 200 660 L 205 530 L 235 410 L 220 310 L 150 250 L 140 180"
                opacity="0.85"
                stroke="#ffffff"
                strokeDasharray="8 16"
                strokeLinecap="round"
                strokeWidth="3"
              >
                <animate attributeName="stroke-dashoffset" dur="1.8s" repeatCount="indefinite" values="48;0"></animate>
              </path>

              {/* Radar Pulse Waves from Vehicle */}
              <circle cx="205" cy="530" fill="#8ba2d5" fillOpacity="0.18" r="32">
                <animate attributeName="r" dur="2s" repeatCount="indefinite" values="16;44"></animate>
                <animate attributeName="opacity" dur="2s" repeatCount="indefinite" values="0.7;0"></animate>
              </circle>
            </svg>

            {/* Live Vehicle GPS Arrow Anchor */}
            <div className="absolute left-[183px] top-[508px] flex items-center justify-center pointer-events-none z-20">
              <div className="relative flex items-center justify-center w-11 h-11 bg-primary-container rounded-full shadow-xl ring-4 ring-primary-fixed-dim/40">
                <span
                  className="material-symbols-outlined text-primary-fixed text-2xl transform rotate-[-8deg]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  navigation
                </span>
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-surface-container-lowest rounded-full flex items-center justify-center shadow">
                  <div className="w-2 h-2 rounded-full bg-on-tertiary-container animate-ping"></div>
                </div>
              </div>
            </div>

            {/* Pin 1: Pothole */}
            <div className="absolute left-[138px] top-[390px] z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-lowest/95 backdrop-blur-md shadow-lg transform -translate-x-1/2 -translate-y-1/2 border border-outline-variant/20">
              <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
              <span className="font-label-sm text-error font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  warning
                </span>
                Pothole 180m
              </span>
            </div>

            {/* Pin 2: Waterlogging */}
            <div className="absolute left-[285px] top-[290px] z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-lowest/95 backdrop-blur-md shadow-lg transform -translate-x-1/2 -translate-y-1/2 border border-outline-variant/20">
              <span className="w-2 h-2 rounded-full bg-surface-tint"></span>
              <span className="font-label-sm text-primary-container font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  water_damage
                </span>
                Waterlogging 400m
              </span>
            </div>

            {/* Pin 3: Unmarked Bump */}
            <div className="absolute left-[92px] top-[232px] z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-lowest/95 backdrop-blur-md shadow-lg transform -translate-x-1/2 -translate-y-1/2 border border-outline-variant/20">
              <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim"></span>
              <span className="font-label-sm text-on-tertiary-fixed-variant font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  traffic
                </span>
                Unmarked Bump
              </span>
            </div>

            {/* Map Orientation Toggles */}
            <div className="absolute right-4 top-56 z-20 flex flex-col gap-2.5">
              <button
                aria-label="Recenter Map"
                onClick={() => triggerQuickTag('Vehicle centered on Koramangala corridor')}
                className="w-10 h-10 rounded-xl bg-surface-container-lowest/90 backdrop-blur-md text-on-surface flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">my_location</span>
              </button>
              <button
                aria-label="Layers"
                onClick={() => triggerQuickTag('Hazard Heatmap Overlay')}
                className="w-10 h-10 rounded-xl bg-surface-container-lowest/90 backdrop-blur-md text-on-surface flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">layers</span>
              </button>
              <button
                aria-label="Sound Toggle"
                onClick={() => setVoiceActive(!voiceActive)}
                className="w-10 h-10 rounded-xl bg-surface-container-lowest/90 backdrop-blur-md text-on-surface flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">
                  {voiceActive ? 'volume_up' : 'volume_off'}
                </span>
              </button>
            </div>

            {/* TOP HUD OVERLAY: Turn Cue & Live Metrics Card */}
            <div className="absolute top-3 inset-x-3 z-30 flex flex-col gap-2.5">
              {/* Turn Navigation Cue HUD */}
              <div className="w-full bg-primary/95 backdrop-blur-xl text-on-primary rounded-2xl p-3.5 shadow-2xl flex items-center gap-3.5 border border-outline-variant/15">
                <div className="w-12 h-12 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center flex-shrink-0 shadow-inner">
                  <span className="material-symbols-outlined text-3xl font-bold">turn_right</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="font-display text-headline-md tracking-tight font-extrabold text-on-primary truncate">
                      In 350m
                    </span>
                    <span className="font-label-md text-tertiary-fixed font-bold bg-tertiary-container px-2 py-0.5 rounded-md flex-shrink-0">
                      CRATER WARNING
                    </span>
                  </div>
                  <p className="font-body-md text-primary-fixed text-xs sm:text-sm font-medium line-clamp-1">
                    Caution severe crater near Sony World Signal
                  </p>
                </div>
              </div>

              {/* Live Telemetry Glass Matrix */}
              <div className="w-full bg-surface-container-lowest/90 backdrop-blur-xl rounded-2xl p-3 shadow-lg flex items-center justify-between border border-outline-variant/15">
                {/* Metric 1: Distance */}
                <div className="flex flex-col items-center flex-1 px-1">
                  <span className="font-label-sm text-secondary uppercase font-semibold">Distance</span>
                  <div className="flex items-baseline gap-0.5 mt-0.5">
                    <span className="font-display text-headline-sm font-extrabold text-on-surface">4.6</span>
                    <span className="font-label-sm text-secondary font-semibold">km</span>
                  </div>
                </div>
                <div className="w-px h-7 bg-outline-variant/50"></div>

                {/* Metric 2: Elapsed Time */}
                <div className="flex flex-col items-center flex-1 px-1">
                  <span className="font-label-sm text-secondary uppercase font-semibold">Time</span>
                  <div className="flex items-baseline gap-0.5 mt-0.5">
                    <span className="font-display text-headline-sm font-extrabold text-on-surface">
                      {formatTime(secondsElapsed)}
                    </span>
                  </div>
                </div>
                <div className="w-px h-7 bg-outline-variant/50"></div>

                {/* Metric 3: Hazards detected */}
                <div className="flex flex-col items-center flex-1 px-1">
                  <span className="font-label-sm text-secondary uppercase font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping"></span>
                    Hazards
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-display text-headline-sm font-extrabold text-error">3</span>
                    <span className="font-label-sm text-error font-semibold">Alerts</span>
                  </div>
                </div>
                <div className="w-px h-7 bg-outline-variant/50"></div>

                {/* Metric 4: Speed */}
                <div className="flex flex-col items-center flex-1 px-1">
                  <span className="font-label-sm text-secondary uppercase font-semibold">Speed</span>
                  <div className="flex items-baseline gap-0.5 mt-0.5">
                    <span className="font-display text-headline-sm font-extrabold text-primary-container">
                      {currentSpeed}
                    </span>
                    <span className="font-label-sm text-secondary font-semibold">km/h</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Speed Limit Pill Overlay on Map */}
            <div className="absolute left-4 bottom-28 z-20 flex items-center gap-2">
              <div className="w-11 h-11 rounded-full bg-surface-container-lowest text-error flex flex-col items-center justify-center shadow-lg ring-2 ring-error">
                <span className="font-label-sm text-[8px] leading-none font-bold uppercase text-secondary">Limit</span>
                <span className="font-display text-label-lg font-black text-on-surface leading-tight">50</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-surface-container-lowest/90 backdrop-blur-md shadow-md border border-outline-variant/10">
                <p className="font-label-sm text-secondary">Current Road</p>
                <p className="font-headline-sm text-xs font-bold text-on-surface">Koramangala 80ft Rd</p>
              </div>
            </div>

            {/* FLOATING ACTION BUTTON: Quick 1-Tap Hazard Report -> /report */}
            <div className="absolute right-4 bottom-24 z-30">
              <button
                id="floating-report-btn"
                aria-label="Instant Hazard Report"
                onClick={() => navigate('/report')}
                className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-on-tertiary-container text-on-primary shadow-2xl active:scale-90 transition-all duration-200 focus:outline-none cursor-pointer"
              >
                <span className="absolute -inset-2 rounded-full bg-on-tertiary-container/30 animate-ping pointer-events-none"></span>
                <span className="absolute -inset-1 rounded-full bg-tertiary-fixed-dim/40 blur-sm pointer-events-none"></span>
                <div className="relative flex flex-col items-center justify-center">
                  <span
                    className="material-symbols-outlined text-2xl font-bold text-surface-container-lowest"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    add_alert
                  </span>
                  <span className="font-label-sm text-[9px] font-extrabold tracking-tight uppercase text-surface-container-lowest leading-none mt-0.5">
                    Report
                  </span>
                </div>
              </button>
            </div>

            {/* BOTTOM CONTROL SHEET HUD */}
            <div className="absolute inset-x-0 bottom-0 z-30 p-3 pt-2 bg-gradient-to-t from-primary via-primary/95 to-transparent">
              <div className="bg-surface-container-lowest/95 backdrop-blur-xl rounded-2xl p-3 shadow-2xl flex flex-col gap-2.5 border border-outline-variant/10">
                {/* Live Hazard Quick-Tagger Tray */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                  <button
                    onClick={() => triggerQuickTag('Pothole')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-label-md hover:bg-surface-container active:scale-95 transition-all flex-shrink-0 cursor-pointer"
                  >
                    <span
                      className="material-symbols-outlined text-sm text-tertiary-fixed-dim"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      circle
                    </span>
                    Pothole
                  </button>
                  <button
                    onClick={() => triggerQuickTag('Waterlog')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-label-md hover:bg-surface-container active:scale-95 transition-all flex-shrink-0 cursor-pointer"
                  >
                    <span
                      className="material-symbols-outlined text-sm text-surface-tint"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      water
                    </span>
                    Waterlog
                  </button>
                  <button
                    onClick={() => triggerQuickTag('Road Work')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-label-md hover:bg-surface-container active:scale-95 transition-all flex-shrink-0 cursor-pointer"
                  >
                    <span
                      className="material-symbols-outlined text-sm text-error"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      construction
                    </span>
                    Road Work
                  </button>
                  <button
                    onClick={() => triggerQuickTag('Unmarked Bump')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-label-md hover:bg-surface-container active:scale-95 transition-all flex-shrink-0 cursor-pointer"
                  >
                    <span
                      className="material-symbols-outlined text-sm text-secondary"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      speed
                    </span>
                    Unmarked Bump
                  </button>
                </div>

                {/* Primary Action Tier: Guidance Status & End Ride Button */}
                <div className="flex items-center gap-2.5 pt-1">
                  {/* Voice Navigation Status Pill */}
                  <button
                    aria-label="Toggle Navigation Audio"
                    onClick={() => setVoiceActive(!voiceActive)}
                    className={`h-12 px-3.5 rounded-xl bg-surface-container text-on-surface flex items-center justify-center gap-2 hover:bg-surface-variant active:scale-95 transition-transform flex-shrink-0 cursor-pointer ${
                      !voiceActive ? 'opacity-50' : ''
                    }`}
                    id="voice-toggle-btn"
                  >
                    <span className="material-symbols-outlined text-primary-container text-xl" id="voice-icon">
                      {voiceActive ? 'record_voice_over' : 'voice_over_off'}
                    </span>
                    <span className="font-label-sm text-xs font-bold text-primary-container hidden sm:inline">
                      {voiceActive ? 'Voice On' : 'Voice Off'}
                    </span>
                  </button>

                  {/* Reroute Button */}
                  <button
                    aria-label="Alternative Safer Route"
                    onClick={() => triggerQuickTag('Rerouting via Inner Ring Road')}
                    className="h-12 w-12 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center hover:opacity-90 active:scale-95 transition-transform flex-shrink-0 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xl">alt_route</span>
                  </button>

                  {/* Urgent Primary End Ride Button */}
                  <button
                    id="end-ride-trigger"
                    onClick={() => setIsModalOpen(true)}
                    className="flex-1 h-12 px-4 rounded-xl bg-error text-on-error flex items-center justify-center gap-2 font-label-lg font-bold shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      stop_circle
                    </span>
                    <span className="tracking-wide">End & Save Ride</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Confirm End Ride Modal Sheet */}
            {isModalOpen && (
              <div
                id="end-confirm-modal"
                className="absolute inset-0 z-50 bg-primary/70 backdrop-blur-sm flex items-end justify-center p-4 animate-in fade-in"
              >
                <div className="w-full bg-surface-container-lowest rounded-3xl p-5 shadow-2xl flex flex-col gap-4 border border-outline-variant/20 animate-in slide-in-from-bottom-5">
                  <div className="flex items-center gap-3 text-on-surface">
                    <div className="w-12 h-12 rounded-2xl bg-error-container text-on-error-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-2xl">flag_circle</span>
                    </div>
                    <div>
                      <h3 className="font-headline-sm font-bold text-on-surface">Finish Ride & Save Stats?</h3>
                      <p className="font-body-sm text-secondary">Logged 4.6 km and 3 civic hazard detections.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      id="cancel-end-btn"
                      onClick={() => setIsModalOpen(false)}
                      className="h-12 rounded-xl bg-surface-container-high text-on-surface font-label-lg font-semibold active:scale-95 transition-transform cursor-pointer"
                    >
                      Resume
                    </button>
                    <button
                      id="confirm-save-btn"
                      onClick={handleConfirmSave}
                      disabled={isSaving}
                      className="h-12 rounded-xl bg-error text-on-error font-label-lg font-bold shadow-md active:scale-95 transition-transform cursor-pointer flex items-center justify-center gap-1 disabled:opacity-80"
                    >
                      {isSaving && <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>}
                      <span>{isSaving ? 'Saving...' : 'Yes, Save & Exit'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Report Notification Toast */}
            {showToast && (
              <div
                id="report-toast"
                className="absolute top-28 inset-x-6 z-40 bg-on-secondary-fixed text-surface-bright rounded-2xl p-3 shadow-2xl flex items-center gap-3 transition-all duration-300 border border-outline-variant/20 animate-in fade-in slide-in-from-top-2"
              >
                <div className="w-8 h-8 rounded-full bg-on-tertiary-container flex items-center justify-center text-on-primary shrink-0">
                  <span className="material-symbols-outlined text-base">check</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-label-md text-xs font-bold text-surface-container-lowest">{toastMessage}</p>
                  <p className="font-body-sm text-[11px] text-surface-variant">{toastSubtitle}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
