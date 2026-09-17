import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const isHome = currentPath === '/home';
  const isRide = currentPath.startsWith('/ride');
  const isDashboard = currentPath === '/dashboard';
  const isProfile = currentPath === '/profile';

  return (
    <nav
      id="bottom-nav-bar"
      className="fixed bottom-0 w-full z-50 pb-safe bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_-4px_20px_rgba(31,56,100,0.08)] border-t border-outline-variant/20"
      aria-label="Main Navigation"
    >
      <div className="h-20 px-space-sm flex items-center justify-around max-w-lg mx-auto">
        {/* Home */}
        <button
          id="nav-tab-home"
          onClick={() => navigate('/home')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 transition-colors cursor-pointer ${
            isHome ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
          }`}
          aria-current={isHome ? 'page' : undefined}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={isHome ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            explore
          </span>
          <span className="font-label-sm text-label-sm mt-0.5">Home</span>
        </button>

        {/* Ride */}
        <button
          id="nav-tab-ride"
          onClick={() => {
            if (currentPath === '/ride/active') {
              // Stay or re-navigate to ride
              navigate('/ride/active');
            } else {
              navigate('/ride/start');
            }
          }}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 group cursor-pointer ${
            isRide ? 'text-primary font-bold' : 'text-on-surface-variant'
          }`}
          aria-current={isRide ? 'page' : undefined}
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-[0_4px_16px_rgba(245,166,35,0.35)] active:scale-95 transition-transform ${
              isRide ? 'bg-tertiary-fixed-dim text-on-tertiary-fixed ring-2 ring-primary/40' : 'bg-tertiary-fixed-dim text-on-tertiary-fixed'
            }`}
          >
            <span
              className="material-symbols-outlined text-[26px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              near_me
            </span>
          </div>
          <span className="font-label-sm text-label-sm mt-0.5">Ride</span>
        </button>

        {/* Dashboard */}
        <button
          id="nav-tab-dashboard"
          onClick={() => navigate('/dashboard')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 transition-colors cursor-pointer ${
            isDashboard ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
          }`}
          aria-current={isDashboard ? 'page' : undefined}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={isDashboard ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            analytics
          </span>
          <span className="font-label-sm text-label-sm mt-0.5">Dashboard</span>
        </button>

        {/* Profile */}
        <button
          id="nav-tab-profile"
          onClick={() => navigate('/profile')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 transition-colors cursor-pointer ${
            isProfile ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
          }`}
          aria-current={isProfile ? 'page' : undefined}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={isProfile ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            account_circle
          </span>
          <span className="font-label-sm text-label-sm mt-0.5">Profile</span>
        </button>
      </div>
    </nav>
  );
}
