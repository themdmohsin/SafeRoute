import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LOGO_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1V3VxtXLXZ-OxUo3gXxROVH0esZPHsa8waby3mZRV_KH4FdKX9FTkgN5s9TeZijNrI0FM7vQpgZzC2P7KXLwFsidJ6HPzM5C6mBZH6W5K-MDnTcH0pDViUCt9nJw9_-3Fh9tcrUJceZ0LvBZ2mTdiPdF87b0vex19uYyMdpCanjjWygeGurlteazL-Xnkt1TDVbtXVTAinw2J7safTglr5Qfj6Bikd2n43Okj2vQuarDiqvKBb-fTL5j3A';

export default function SplashScreen() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(78);
  const [statusText, setStatusText] = useState('Syncing BBMP road hazard telemetry...');

  useEffect(() => {
    const statuses = [
      { at: 82, text: 'Calibrating Koramangala - ORR radar...' },
      { at: 91, text: 'Resolving civic hazard coordinates...' },
      { at: 98, text: 'Live road telemetry locked' },
      { at: 100, text: 'Welcome to SafeRoute' },
    ];

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => navigate('/login'), 400);
          return 100;
        }
        const next = prev + 1;
        const matchingStatus = statuses.find((s) => s.at === next);
        if (matchingStatus) {
          setStatusText(matchingStatus.text);
        }
        return next;
      });
    }, 85);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleTap = () => {
    navigate('/login');
  };

  return (
    <div
      id="splash-screen-container"
      onClick={handleTap}
      className="bg-primary-container text-surface pt-safe pb-safe antialiased min-h-screen flex flex-col cursor-pointer select-none relative overflow-hidden"
    >
      <main className="flex-1 flex flex-col relative w-full justify-between items-center text-center py-10 px-6 max-w-lg mx-auto">
        {/* Ambient Map Grid & Radar Background Elements */}
        <div className="absolute inset-0 pointer-events-none opacity-20 flex items-center justify-center">
          <svg className="w-full h-full" height="100%" width="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern height="48" id="grid-pattern" patternUnits="userSpaceOnUse" width="48">
                <path className="text-primary-fixed-dim" d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.75" />
                <circle className="text-on-tertiary-container" cx="24" cy="24" fill="currentColor" r="1.5" />
              </pattern>
              <radialGradient cx="50%" cy="50%" id="radar-glow" r="50%">
                <stop offset="0%" stopColor="#dd9202" stopOpacity="0.35" />
                <stop offset="60%" stopColor="#1f3864" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#03224d" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect fill="url(#grid-pattern)" height="100%" width="100%" />
            <circle cx="50%" cy="42%" fill="url(#radar-glow)" r="180" />
            <circle className="text-on-primary-container opacity-40 animate-pulse" cx="50%" cy="42%" fill="none" r="110" stroke="currentColor" strokeDasharray="4 6" strokeWidth="1" />
            <circle className="text-on-primary-container opacity-25" cx="50%" cy="42%" fill="none" r="170" stroke="currentColor" strokeWidth="1" />
            <circle className="text-surface-tint opacity-30" cx="50%" cy="42%" fill="none" r="240" stroke="currentColor" strokeDasharray="2 8" strokeWidth="0.75" />
          </svg>
        </div>

        {/* Top Civic Tag */}
        <div className="relative z-10 pt-2 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-container/80 backdrop-blur-md shadow-sm border border-primary-fixed-dim/20">
            <span className="w-2 h-2 rounded-full bg-tertiary-fixed animate-ping"></span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-tertiary-fixed">
              Bengaluru Road Safety Network
            </span>
          </div>
        </div>

        {/* Central Brand Hero with Pulse Rings */}
        <div className="relative z-10 flex flex-col items-center my-auto py-6">
          <div className="relative flex items-center justify-center mb-7">
            <div className="absolute w-44 h-44 rounded-full bg-on-tertiary-container/15 animate-ping duration-1000"></div>
            <div className="absolute w-36 h-36 rounded-full bg-surface-tint/20 backdrop-blur-sm animate-pulse"></div>

            {/* Brand Emblem Anchor */}
            <div className="relative w-28 h-28 rounded-3xl p-1 bg-gradient-to-b from-primary-fixed/40 via-surface-variant/20 to-transparent shadow-2xl flex items-center justify-center">
              <img
                alt="SafeRoute Emblem"
                className="w-full h-full object-contain rounded-2xl drop-shadow-[0_12px_24px_rgba(221,146,2,0.35)] transition-transform duration-700 hover:scale-105"
                src={LOGO_URL}
              />
            </div>

            {/* Floating Incident Verification Beacon */}
            <div className="absolute -bottom-2 -right-1 bg-surface-container-lowest text-primary px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 border border-outline-variant/30">
              <span className="material-symbols-outlined text-[15px] text-on-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified
              </span>
              <span className="font-label-sm text-label-sm font-bold text-primary">BBMP LIVE</span>
            </div>
          </div>

          <h1 className="font-display text-display text-surface tracking-tight mb-1">
            SafeRoute
          </h1>
          <p className="font-headline-sm text-headline-sm text-primary-fixed-dim font-medium tracking-wide mb-2">
            Ride safe. Report smart.
          </p>
          <p className="font-body-sm text-body-sm text-secondary-container max-w-xs px-2 opacity-85">
            Hyperlocal road hazard alerts, live pothole crowdsourcing, and civic telemetry for urban commuters.
          </p>
        </div>

        {/* Bottom Dynamic Status & Telemetry Sync Module */}
        <div className="relative z-10 w-full max-w-xs flex flex-col items-center gap-4 pb-4">
          <div className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-surface-container-lowest/10 backdrop-blur-md shadow-sm border border-outline-variant/10">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[18px] text-tertiary-fixed animate-spin" style={{ animationDuration: '3s' }}>
                sync
              </span>
              <span className="font-label-md text-label-md text-surface-bright truncate" id="telemetry-label">
                {statusText}
              </span>
            </div>
            <span className="font-label-md text-label-md text-tertiary-fixed font-bold ml-2" id="progress-percent">
              {progress}%
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-primary/60 overflow-hidden p-0.5 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-on-tertiary-container via-tertiary-fixed-dim to-tertiary-fixed transition-all duration-300 ease-out shadow-sm"
              id="loading-bar"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-center gap-2 pt-1 opacity-70">
            <span className="material-symbols-outlined text-[14px] text-primary-fixed-dim">sensors</span>
            <p className="font-body-sm text-body-sm text-secondary-container">
              Connecting to civic transit grid • v2.4 (Tap to enter)
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
