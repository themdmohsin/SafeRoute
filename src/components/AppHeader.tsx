import React from 'react';
import { useNavigate } from 'react-router-dom';

const LOGO_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1V3VxtXLXZ-OxUo3gXxROVH0esZPHsa8waby3mZRV_KH4FdKX9FTkgN5s9TeZijNrI0FM7vQpgZzC2P7KXLwFsidJ6HPzM5C6mBZH6W5K-MDnTcH0pDViUCt9nJw9_-3Fh9tcrUJceZ0LvBZ2mTdiPdF87b0vex19uYyMdpCanjjWygeGurlteazL-Xnkt1TDVbtXVTAinw2J7safTglr5Qfj6Bikd2n43Okj2vQuarDiqvKBb-fTL5j3A';

interface AppHeaderProps {
  title: string;
  variant?: 'subpage' | 'main';
  onBack?: () => void;
  showBack?: boolean;
}

export default function AppHeader({
  title,
  variant = 'main',
  onBack,
  showBack = false,
}: AppHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      id={`header-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className="fixed top-0 w-full z-50 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-outline-variant/10"
    >
      <div className="h-16 px-margin flex items-center justify-between gap-space-sm max-w-lg mx-auto">
        <div className="flex items-center gap-space-sm min-w-0">
          {(showBack || variant === 'subpage') && (
            <button
              id="header-back-button"
              aria-label="Go Back"
              className="w-11 h-11 flex items-center justify-center rounded-full bg-surface-container-low text-on-surface hover:text-primary transition-colors shrink-0 cursor-pointer"
              onClick={handleBack}
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
          )}

          <img
            alt="SafeRoute Logo"
            className="h-8 w-auto object-contain shrink-0 cursor-pointer"
            src={LOGO_URL}
            onClick={() => navigate('/home')}
          />

          {variant === 'subpage' ? (
            <h1 className="font-headline-sm text-headline-sm text-primary truncate leading-tight">
              {title}
            </h1>
          ) : (
            <div className="flex flex-col min-w-0">
              <span
                className="font-headline-sm text-headline-sm text-primary truncate leading-none cursor-pointer"
                onClick={() => navigate('/home')}
              >
                SafeRoute
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant tracking-wider uppercase truncate leading-tight mt-0.5">
                {title}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-space-sm shrink-0">
          {variant === 'main' && (
            <button
              aria-label="Alerts and notifications"
              className="w-11 h-11 flex items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              onClick={() => {
                alert('Civic Safety Alert: BBMP road repair active in Indiranagar Ward 112.');
              }}
            >
              <span className="material-symbols-outlined text-[22px]">notifications_active</span>
            </button>
          )}
          <button
            aria-label="Profile"
            onClick={() => navigate('/profile')}
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </button>
        </div>
      </div>
    </header>
  );
}
