import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader.tsx';
import BottomNav from '../components/BottomNav.tsx';
import Toast from '../components/Toast.tsx';

export default function HomeScreen() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('All (12)');
  const [confirmedCard1, setConfirmedCard1] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastIcon, setToastIcon] = useState('check_circle');
  const [isToastOpen, setIsToastOpen] = useState(false);

  const showToast = (msg: string, icon = 'check_circle') => {
    setToastMessage(msg);
    setToastIcon(icon);
    setIsToastOpen(true);
  };

  const handleInstantReport = (type: string) => {
    showToast(`Instant ${type} pinned at 100ft Road! Telemetry synced.`, 'pin_drop');
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
                  Hi, Arjun 👋
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-tertiary-fixed-dim/30 text-on-tertiary-container font-label-sm text-label-sm font-semibold">
                  Commuter Pro
                </span>
              </div>
              <button
                aria-label="Quick alerts"
                onClick={() => showToast('2 unread road notifications for your route', 'notifications')}
                className="relative w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary active:scale-95 transition-transform cursor-pointer border border-outline-variant/10"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-tertiary-fixed-dim animate-ping opacity-75"></span>
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-tertiary-fixed-dim shadow-[0_0_8px_rgba(255,185,85,0.8)]"></span>
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
                    100ft Rd, Indiranagar
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Live GPS • High Accuracy (±2m)</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => showToast('GPS recalibrated: accuracy ±1.8m', 'my_location')}
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
                  AI Pothole Auto-Detect Active
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
                  Real-time audible warnings for 42 verified craters & sudden speed humps on your route.
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

          {/* Quick Civic Telemetry Metrics */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="flex flex-col p-3 rounded-2xl bg-surface-container-low shadow-sm border border-outline-variant/10">
              <div className="flex items-center gap-1 text-on-surface-variant mb-1">
                <span className="material-symbols-outlined text-[16px] text-surface-tint">verified_user</span>
                <span className="font-label-sm text-label-sm font-semibold">Safety</span>
              </div>
              <span className="font-display text-lg font-bold text-primary leading-none">
                88<span className="text-xs text-on-surface-variant font-normal">/100</span>
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant mt-1 truncate">Optimal route</span>
            </div>

            <div className="flex flex-col p-3 rounded-2xl bg-surface-container-low shadow-sm border border-outline-variant/10">
              <div className="flex items-center gap-1 text-on-surface-variant mb-1">
                <span className="material-symbols-outlined text-[16px] text-tertiary-container">troubleshoot</span>
                <span className="font-label-sm text-label-sm font-semibold">Avoided</span>
              </div>
              <span className="font-display text-lg font-bold text-on-tertiary-container leading-none">14</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant mt-1 truncate">Hazards today</span>
            </div>

            <div className="flex flex-col p-3 rounded-2xl bg-surface-container-low shadow-sm border border-outline-variant/10">
              <div className="flex items-center gap-1 text-on-surface-variant mb-1">
                <span className="material-symbols-outlined text-[16px] text-primary">military_tech</span>
                <span className="font-label-sm text-label-sm font-semibold">Impact</span>
              </div>
              <span className="font-display text-lg font-bold text-primary leading-none">Top 5%</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant mt-1 truncate">Bengaluru East</span>
            </div>
          </div>

          {/* Live Mini Area Radar Map Thumbnail */}
          <div
            onClick={() => navigate('/ride/start')}
            className="relative w-full h-36 rounded-3xl overflow-hidden shadow-sm cursor-pointer group"
          >
            <div
              className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBumv8pZM6rgNfV9roEdKMGm5twCdV1SJxk55uitLmvu-GYISWw-XAsj7Br38Kzw8nh_bIjhLqTEmGuUuHvXjsKKkHi9oxImmVBMgZEcjODYk1F0vOELE36aR3iVOsnWenp0k1yvpuc9CqAFKidk8Bd-85YJc5QR-YplPTN64fGEL3_zUCmQtwuvKx0Cp8LOxGQIVFyea5p--E2jcQSsDvfcaGS9wq2XTVsq_5kDZ7vEqAmV7xVda8j')`,
              }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent"></div>
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-on-primary">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary-fixed-dim animate-ping"></span>
                <span className="font-label-sm text-label-sm font-semibold">3 Reports Active Within 1.5 km</span>
              </div>
              <span className="font-label-sm text-label-sm px-2.5 py-1 rounded-full bg-surface-container-lowest/20 backdrop-blur-md font-semibold">
                Radar View
              </span>
            </div>
          </div>

          {/* Section: Recent Hazards Near You */}
          <div className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Hazards Near You</h3>
                <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-semibold">
                  3 Live
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
              {['All (12)', 'Deep Potholes', 'Waterlogging', 'Roadwork'].map((filter) => (
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
              {/* Card 1: Severe Pothole */}
              {(activeFilter === 'All (12)' || activeFilter === 'Deep Potholes') && (
                <div className="flex flex-col p-4 rounded-2xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow gap-space-sm border border-outline-variant/10">
                  <div className="flex items-start gap-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-surface-container">
                      <img
                        className="w-full h-full object-cover"
                        alt="Pothole crack"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCgilNwVtxPwTIxgiugzdQOyvaWO_JQwEpZVQwsT-IU17wuhBWsVWS2XUdUl1B5Bo4RMR0aCCLk_FYB43Y-DNiRzm0I2dUQZCjKadKfK7-117FBQiGrYj88ZpZSrhtfV7mNGYXeuL_wnT4XvmknvLlDlRcCML-E4ysxStqog7Cs5Y24UeUBhlEEiG-9YxrxolTq0BeUV39oLmQqHfJ4kjhFoTR_1iKKx-Kv-FE7lnJOSu8jXcC5a5id"
                      />
                      <span className="absolute bottom-1 right-1 px-1 rounded bg-black/60 text-white font-label-sm text-[9px] leading-tight">
                        12cm
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-label-sm text-label-sm font-semibold">
                          <span className="material-symbols-outlined text-[13px] text-amber-600">warning</span>
                          Severe Pothole
                        </span>
                        <span className="font-label-md text-label-md text-error font-semibold shrink-0">120m away</span>
                      </div>
                      <h4 className="font-headline-sm text-sm text-on-surface font-bold mt-1 truncate">
                        12th Main Road, Indiranagar
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                        Near Corner House • Left lane sunken
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 bg-surface-container-low/60 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="material-symbols-outlined text-[16px] text-emerald-700">verified</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                        {confirmedCard1 ? '19 Verified' : '18 Verified'} • BBMP Notified
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setConfirmedCard1(true);
                        showToast('Thanks for confirming! +15 Civic XP added.', 'thumb_up');
                      }}
                      className={`flex items-center gap-1 font-label-sm text-label-sm font-semibold shrink-0 cursor-pointer ${
                        confirmedCard1 ? 'text-emerald-600' : 'text-primary hover:text-surface-tint'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {confirmedCard1 ? 'check_circle' : 'thumb_up'}
                      </span>
                      <span>{confirmedCard1 ? 'Verified!' : 'Confirm'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Card 2: Unmarked Speed Breaker */}
              {(activeFilter === 'All (12)' || activeFilter === 'Roadwork') && (
                <div className="flex flex-col p-4 rounded-2xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow gap-space-sm border border-outline-variant/10">
                  <div className="flex items-start gap-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-surface-container">
                      <img
                        className="w-full h-full object-cover"
                        alt="Unpainted speed hump"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCIIa_DZUQPjMrpc5i_NVCuO9OTiSUuvig-LZ5j6wkXyqYRSwhuYrL4sfc78ZQpSXl4jrq-q45wggBt8GrxoAfkF1bCHiZeOTHlGWAJfartTKLFuXF2p3PK-ZsgcYq5-uWxseBJwvdgFETvu9a6Kwtne8kdY1ia5wSvmfuNqmEXSxnfyqGAn6SWiYnQAKiwHweU5F85_jRGxgSRn-aRuOfhwDXbP71n3cLu1S4RyN_2HKq_HjPfhPl0"
                      />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-800 font-label-sm text-label-sm font-semibold">
                          <span className="material-symbols-outlined text-[13px] text-orange-600">report_problem</span>
                          Unmarked Hump
                        </span>
                        <span className="font-label-md text-label-md text-on-surface-variant font-semibold shrink-0">
                          450m away
                        </span>
                      </div>
                      <h4 className="font-headline-sm text-sm text-on-surface font-bold mt-1 truncate">
                        Sony World Signal, Koramangala
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                        Zero reflective paint • Critical night risk
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 bg-surface-container-low/60 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="material-symbols-outlined text-[16px] text-on-tertiary-container">nightlight</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                        Caution • High collision risk after sunset
                      </span>
                    </div>
                    <button
                      onClick={() => navigate('/ride/start')}
                      className="flex items-center gap-1 text-primary hover:text-surface-tint font-label-sm text-label-sm font-semibold shrink-0 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">navigation</span>
                      <span>Bypass</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Card 3: Waterlogged Crater Patch */}
              {(activeFilter === 'All (12)' || activeFilter === 'Waterlogging') && (
                <div className="flex flex-col p-4 rounded-2xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow gap-space-sm border border-outline-variant/10">
                  <div className="flex items-start gap-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-surface-container">
                      <img
                        className="w-full h-full object-cover"
                        alt="Waterlogged hole"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCAyiKOKJZ3AEHTsSOJu5XwtxTPE-k48HWcKJHskBnKeixOQy1G8XjJenOS-WzJxN_maNq9yTdPc9_6QeL2N5k6jZeyKwUPiDO_aughSa26j4VKr8ouhHLymaCTZgEIrMiWRtPF1tx3oAK5HdfAshcuLSADDKZl4cW1cslc8CIHjW78FoMPz1jrIQHUaoiqX3I8IsRT-xRwcbBDadYLyGc7B1LdvnllE658JqYl3dgQFdrYiae7joju"
                      />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 font-label-sm text-label-sm font-semibold">
                          <span className="material-symbols-outlined text-[13px] text-blue-600">water</span>
                          Waterlogged Hole
                        </span>
                        <span className="font-label-md text-label-md text-on-surface-variant font-semibold shrink-0">
                          1.2 km away
                        </span>
                      </div>
                      <h4 className="font-headline-sm text-sm text-on-surface font-bold mt-1 truncate">
                        Silk Board Down-Ramp
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                        Reported 25 mins ago by Traffic Marshall
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 bg-surface-container-low/60 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="material-symbols-outlined text-[16px] text-error">schedule</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                        Slow traffic moving at 8 km/h
                      </span>
                    </div>
                    <button
                      onClick={() => showToast('Community alert broadcasted to 420 commuters', 'share')}
                      className="flex items-center gap-1 text-primary hover:text-surface-tint font-label-sm text-label-sm font-semibold shrink-0 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">share</span>
                      <span>Alert</span>
                    </button>
                  </div>
                </div>
              )}
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
                <span className="font-body-sm text-[10px] text-on-surface-variant leading-none">GPS Locked</span>
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

          {/* Civic Community Pulse Banner */}
          <div className="rounded-2xl bg-secondary-container/40 p-3.5 flex items-center justify-between gap-3 mt-1 border border-outline-variant/10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">diversity_3</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md text-on-secondary-container font-semibold truncate">
                  Civic Action Drive
                </span>
                <span className="font-body-sm text-body-sm text-secondary truncate">
                  BBMP asphalt team dispatched to 100ft Rd
                </span>
              </div>
            </div>
            <button
              onClick={() => showToast('Dispatch Tracking: Team 14 arriving at 12th Main junction in 15 mins.', 'info')}
              className="font-label-sm text-label-sm text-primary font-bold px-2 py-1 rounded bg-surface-container-lowest shadow-sm shrink-0 cursor-pointer hover:bg-surface-container"
            >
              Track
            </button>
          </div>
        </div>
      </main>

      <BottomNav />
      <Toast message={toastMessage} icon={toastIcon} isOpen={isToastOpen} onClose={() => setIsToastOpen(false)} />
    </div>
  );
}
