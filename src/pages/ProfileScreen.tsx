import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader.tsx';
import BottomNav from '../components/BottomNav.tsx';
import Toast from '../components/Toast.tsx';

export default function ProfileScreen() {
  const navigate = useNavigate();
  const [audibleAlerts, setAudibleAlerts] = useState(true);
  const [autoDetect, setAutoDetect] = useState(true);
  const [anonymousTelemetry, setAnonymousTelemetry] = useState(true);
  const [darkMapMode, setDarkMapMode] = useState(false);

  const [toastMessage, setToastMessage] = useState('');
  const [isToastOpen, setIsToastOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setIsToastOpen(true);
  };

  const handleLogout = () => {
    showToast('Logged out securely. See you on the road!');
    setTimeout(() => {
      navigate('/login');
    }, 700);
  };

  const handleExportData = () => {
    showToast('Civic road telemetry reports exported as CSV');
  };

  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-secondary-container">
      {/* Header title FIXED to "Profile" */}
      <AppHeader title="Profile" variant="main" />

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-24 bg-surface max-w-lg mx-auto">
        <div className="flex flex-col w-full px-margin pb-6 gap-space-lg">
          {/* User Hero Identity Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-container to-primary text-on-primary p-6 shadow-xl shadow-primary-container/20 mt-2">
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-tertiary-fixed-dim/20 blur-2xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              {/* Avatar with Level Ring */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-surface-container-lowest p-1 shadow-xl">
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-tertiary-fixed-dim to-on-tertiary-container flex items-center justify-center text-primary font-bold text-2xl">
                    AS
                  </div>
                </div>
                <span className="absolute bottom-0 right-0 px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold shadow">
                  Lv. 4
                </span>
              </div>

              <div className="flex flex-col flex-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h2 className="font-headline-lg-mobile text-xl font-bold text-on-primary">Arjun Sharma</h2>
                  <span className="material-symbols-outlined text-tertiary-fixed text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified
                  </span>
                </div>
                <p className="font-body-sm text-xs text-primary-fixed">arjun.sharma@example.com</p>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-lowest/20 backdrop-blur-md text-xs text-on-primary font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim"></span>
                    Bengaluru Road Scout
                  </span>
                  <span className="text-xs text-primary-fixed-dim">• Indiranagar</span>
                </div>
              </div>
            </div>

            {/* Profile Counter Matrix */}
            <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-primary-fixed-dim/20 text-center">
              <div>
                <span className="font-display text-xl font-bold text-on-primary">42</span>
                <p className="text-[11px] text-primary-fixed mt-0.5">Reports Filed</p>
              </div>
              <div className="border-x border-primary-fixed-dim/20">
                <span className="font-display text-xl font-bold text-tertiary-fixed-dim">38</span>
                <p className="text-[11px] text-primary-fixed mt-0.5">BBMP Fixed</p>
              </div>
              <div>
                <span className="font-display text-xl font-bold text-on-primary">1,240</span>
                <p className="text-[11px] text-primary-fixed mt-0.5">Civic Karma</p>
              </div>
            </div>
          </div>

          {/* Commuter Badges Row */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-sm font-bold text-primary">Earned Badges</h3>
              <span className="text-xs text-secondary font-semibold">4 / 6 unlocked</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="flex flex-col items-center p-2.5 rounded-2xl bg-surface-container-low text-center gap-1 border border-outline-variant/10">
                <span className="text-2xl">🏆</span>
                <span className="text-[10px] font-bold text-on-surface leading-tight">Pothole Hunter</span>
              </div>
              <div className="flex flex-col items-center p-2.5 rounded-2xl bg-surface-container-low text-center gap-1 border border-outline-variant/10">
                <span className="text-2xl">🌙</span>
                <span className="text-[10px] font-bold text-on-surface leading-tight">Night Sentinel</span>
              </div>
              <div className="flex flex-col items-center p-2.5 rounded-2xl bg-surface-container-low text-center gap-1 border border-outline-variant/10">
                <span className="text-2xl">🌧️</span>
                <span className="text-[10px] font-bold text-on-surface leading-tight">Rain Rider</span>
              </div>
              <div className="flex flex-col items-center p-2.5 rounded-2xl bg-surface-container-low text-center gap-1 border border-outline-variant/10">
                <span className="text-2xl">🛡️</span>
                <span className="text-[10px] font-bold text-on-surface leading-tight">Verified Citizen</span>
              </div>
            </div>
          </div>

          {/* Vehicle Profile Card */}
          <div className="bg-surface-container-low rounded-2xl p-4 shadow-sm flex items-center justify-between border border-outline-variant/10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">two_wheeler</span>
              </div>
              <div>
                <p className="font-label-md font-bold text-on-surface">Royal Enfield Hunter 350</p>
                <p className="font-body-sm text-xs text-secondary font-mono">KA-04-ME-4412 • Two-Wheeler Suspension</p>
              </div>
            </div>
            <button
              onClick={() => showToast('Vehicle specifications verified')}
              className="text-primary hover:text-surface-tint p-1.5 rounded-lg active:bg-surface-container cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
          </div>

          {/* Settings & Telemetry Preferences */}
          <div className="bg-surface-container-low rounded-3xl p-4 shadow-sm flex flex-col gap-4 border border-outline-variant/10">
            <h3 className="font-headline-sm text-sm font-bold text-primary">Ride & Safety Preferences</h3>

            <div className="flex flex-col gap-3">
              {/* Toggle 1: Audible Alerts */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-label-md text-sm font-semibold text-on-surface">Audible Crater Alerts</p>
                  <p className="font-body-sm text-xs text-secondary">Voice warnings 300m before severe hazards</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    checked={audibleAlerts}
                    onChange={(e) => setAudibleAlerts(e.target.checked)}
                    className="sr-only peer"
                    type="checkbox"
                  />
                  <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                </label>
              </div>

              {/* Toggle 2: Auto-detect bumps */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-label-md text-sm font-semibold text-on-surface">Auto-Detect Surface Bumps</p>
                  <p className="font-body-sm text-xs text-secondary">Sensor gyros log vibration spikes while riding</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    checked={autoDetect}
                    onChange={(e) => setAutoDetect(e.target.checked)}
                    className="sr-only peer"
                    type="checkbox"
                  />
                  <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                </label>
              </div>

              {/* Toggle 3: Anonymous Telemetry */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-label-md text-sm font-semibold text-on-surface">Anonymous Civic Telemetry</p>
                  <p className="font-body-sm text-xs text-secondary">Contribute masked road coordinates to BBMP</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    checked={anonymousTelemetry}
                    onChange={(e) => setAnonymousTelemetry(e.target.checked)}
                    className="sr-only peer"
                    type="checkbox"
                  />
                  <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                </label>
              </div>

              {/* Toggle 4: Dark Map Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-label-md text-sm font-semibold text-on-surface">Night Navigation Theme</p>
                  <p className="font-body-sm text-xs text-secondary">High contrast display for nighttime commutes</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    checked={darkMapMode}
                    onChange={(e) => setDarkMapMode(e.target.checked)}
                    className="sr-only peer"
                    type="checkbox"
                  />
                  <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Account & Export Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleExportData}
              className="w-full h-12 rounded-2xl bg-surface-container-low hover:bg-surface-container text-primary font-label-md font-semibold flex items-center justify-center gap-2 border border-outline-variant/10 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Export My Road Reports (CSV)</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full h-12 rounded-2xl bg-error-container/40 hover:bg-error-container text-on-error-container font-label-md font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>Log Out of SafeRoute</span>
            </button>
          </div>

          <div className="text-center text-xs text-secondary pt-2">
            SafeRoute Bengaluru • App Version 2.4.1 (Build 890)
          </div>
        </div>
      </main>

      <BottomNav />
      <Toast message={toastMessage} icon="check_circle" isOpen={isToastOpen} onClose={() => setIsToastOpen(false)} />
    </div>
  );
}
