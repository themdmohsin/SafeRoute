import React, { useState } from 'react';
import AppHeader from '../components/AppHeader.tsx';
import BottomNav from '../components/BottomNav.tsx';
import Toast from '../components/Toast.tsx';

export default function DashboardScreen() {
  const [selectedMonth, setSelectedMonth] = useState('Oct');
  const [toastMessage, setToastMessage] = useState('');
  const [isToastOpen, setIsToastOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setIsToastOpen(true);
  };

  const monthlyData = [
    { month: 'May', count: 420, height: '40%' },
    { month: 'Jun', count: 780, height: '70%' },
    { month: 'Jul', count: 1150, height: '95%' }, // Peak monsoon
    { month: 'Aug', count: 920, height: '80%' },
    { month: 'Sep', count: 640, height: '55%' },
    { month: 'Oct', count: 490, height: '45%' },
  ];

  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-secondary-container">
      {/* Header title FIXED to "Dashboard" */}
      <AppHeader title="Dashboard" variant="main" />

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-24 bg-surface max-w-lg mx-auto">
        <div className="flex flex-col w-full px-margin pb-6 gap-space-lg">
          {/* Header Title Section */}
          <div className="pt-2 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                Bengaluru Civic Mobility
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-label-sm text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                BBMP Feed Active
              </span>
            </div>
            <h1 className="font-headline-lg-mobile text-2xl sm:text-3xl text-primary font-bold tracking-tight">
              Road Health Analytics
            </h1>
            <p className="font-body-sm text-secondary">
              Live crowd-sourced road conditions and municipal repair tracking across 198 wards.
            </p>
          </div>

          {/* Civic Safety Score Hero Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-container to-primary text-on-primary p-5 shadow-xl shadow-primary-container/20">
            <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-tertiary-fixed-dim/20 blur-2xl pointer-events-none"></div>

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="font-label-md text-xs text-primary-fixed uppercase tracking-wider font-semibold">
                  Bengaluru Safety Index
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl font-extrabold text-on-primary">84</span>
                  <span className="text-sm text-primary-fixed">/100</span>
                  <span className="inline-flex items-center text-xs text-emerald-300 font-bold ml-1">
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    +6% this week
                  </span>
                </div>
                <p className="font-body-sm text-xs text-on-primary-container mt-1">
                  Ward 112 (Indiranagar) ranked #3 in road quality this month
                </p>
              </div>

              <div className="relative flex items-center justify-center w-20 h-20">
                <svg className="w-20 h-20 -rotate-90 transform" viewBox="0 0 36 36">
                  <path
                    className="text-primary-fixed-dim/30"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                  />
                  <path
                    className="text-tertiary-fixed-dim"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray="84, 100"
                    strokeLinecap="round"
                    strokeWidth="3.5"
                  />
                </svg>
                <span className="absolute font-display text-sm font-bold text-on-primary">84%</span>
              </div>
            </div>
          </div>

          {/* City-wide Road Health Stats (3 Grid Cards) */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-surface-container-low shadow-sm border border-outline-variant/10 flex flex-col">
              <span className="font-label-sm text-[11px] text-secondary font-semibold">Total Craters</span>
              <span className="font-display text-xl font-bold text-on-surface mt-1">1,428</span>
              <span className="font-body-sm text-[10px] text-secondary mt-0.5">Reported</span>
            </div>

            <div className="p-3 rounded-2xl bg-surface-container-low shadow-sm border border-outline-variant/10 flex flex-col">
              <span className="font-label-sm text-[11px] text-secondary font-semibold">Resolved</span>
              <span className="font-display text-xl font-bold text-emerald-700 mt-1">914</span>
              <span className="font-body-sm text-[10px] text-emerald-600 mt-0.5 font-medium">64% Fixed</span>
            </div>

            <div className="p-3 rounded-2xl bg-surface-container-low shadow-sm border border-outline-variant/10 flex flex-col">
              <span className="font-label-sm text-[11px] text-secondary font-semibold">Hotspots</span>
              <span className="font-display text-xl font-bold text-error mt-1">42</span>
              <span className="font-body-sm text-[10px] text-error mt-0.5 font-medium">High Risk</span>
            </div>
          </div>

          {/* Monthly Pothole Activity Chart */}
          <div className="bg-surface-container-low rounded-3xl p-4 shadow-sm flex flex-col gap-3 border border-outline-variant/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-headline-sm text-sm font-bold text-primary">Monthly Incident Reports</h3>
                <p className="font-body-sm text-xs text-secondary">Monsoon surge vs repair cycles</p>
              </div>
              <span className="font-label-sm text-xs px-2.5 py-1 rounded-full bg-surface-container-high text-primary font-semibold">
                2024
              </span>
            </div>

            {/* Custom Bar Chart */}
            <div className="flex items-end justify-between h-40 pt-4 px-2">
              {monthlyData.map((item) => {
                const isSelected = selectedMonth === item.month;
                return (
                  <div
                    key={item.month}
                    onClick={() => {
                      setSelectedMonth(item.month);
                      showToast(`${item.month} 2024: ${item.count} road hazards recorded`);
                    }}
                    className="flex flex-col items-center gap-1.5 flex-1 cursor-pointer group"
                  >
                    <span
                      className={`text-[10px] font-semibold transition-opacity ${
                        isSelected ? 'text-primary font-bold' : 'text-secondary opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {item.count}
                    </span>
                    <div className="w-8 max-w-full h-28 bg-surface-container-high rounded-xl flex items-end overflow-hidden p-0.5">
                      <div
                        className={`w-full rounded-lg transition-all duration-300 ${
                          isSelected
                            ? 'bg-tertiary-fixed-dim shadow-md'
                            : item.month === 'Jul'
                            ? 'bg-error/80'
                            : 'bg-primary/80 group-hover:bg-primary'
                        }`}
                        style={{ height: item.height }}
                      ></div>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-primary font-bold' : 'text-secondary'
                      }`}
                    >
                      {item.month}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-secondary pt-1 border-t border-outline-variant/10">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-primary"></span> Routine
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-error"></span> Monsoon Peak
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-tertiary-fixed-dim"></span> Selected
              </span>
            </div>
          </div>

          {/* Live Citizen Hazard Feed */}
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
                Live Citizen Hazard Feed
              </h3>
              <button
                onClick={() => showToast('Refreshed latest BBMP dispatch tickets')}
                className="font-label-sm text-surface-tint font-semibold hover:underline cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">refresh</span> Refresh
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Ticket 1 */}
              <div className="p-3.5 rounded-2xl bg-surface-container-low flex flex-col gap-2 border border-outline-variant/10">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-xs font-mono font-semibold text-secondary">
                    TICKET #BBMP-8924
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-label-sm text-xs font-semibold">
                    In Progress
                  </span>
                </div>
                <h4 className="font-headline-sm text-sm font-bold text-on-surface">
                  100ft Road, near 12th Main junction, Indiranagar
                </h4>
                <p className="font-body-sm text-xs text-secondary">
                  Deep crater (14cm) reported by Ananya Rao • BBMP Asphalt crew dispatched
                </p>
                <div className="flex items-center justify-between text-xs text-secondary pt-1 border-t border-outline-variant/10">
                  <span>14 mins ago</span>
                  <span className="font-semibold text-primary">28 Commuter Upvotes</span>
                </div>
              </div>

              {/* Ticket 2 */}
              <div className="p-3.5 rounded-2xl bg-surface-container-low flex flex-col gap-2 border border-outline-variant/10">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-xs font-mono font-semibold text-secondary">
                    TICKET #BBMP-8891
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-label-sm text-xs font-semibold">
                    Resolved
                  </span>
                </div>
                <h4 className="font-headline-sm text-sm font-bold text-on-surface">
                  Sony World Junction, Koramangala
                </h4>
                <p className="font-body-sm text-xs text-secondary">
                  Unmarked speed hump painted with thermoplastic reflective stripes
                </p>
                <div className="flex items-center justify-between text-xs text-secondary pt-1 border-t border-outline-variant/10">
                  <span>2 hours ago</span>
                  <span className="font-semibold text-emerald-700">Closed & Verified</span>
                </div>
              </div>

              {/* Ticket 3 */}
              <div className="p-3.5 rounded-2xl bg-surface-container-low flex flex-col gap-2 border border-outline-variant/10">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-xs font-mono font-semibold text-secondary">
                    TICKET #BBMP-8872
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 font-label-sm text-xs font-semibold">
                    Investigating
                  </span>
                </div>
                <h4 className="font-headline-sm text-sm font-bold text-on-surface">
                  Silk Board Down-Ramp
                </h4>
                <p className="font-body-sm text-xs text-secondary">
                  Waterlogging and collapsed storm-water drain barrier under survey
                </p>
                <div className="flex items-center justify-between text-xs text-secondary pt-1 border-t border-outline-variant/10">
                  <span>3 hours ago</span>
                  <span className="font-semibold text-primary">45 Commuter Alerts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ward Leaderboard */}
          <div className="bg-surface-container-low rounded-3xl p-4 shadow-sm flex flex-col gap-3 border border-outline-variant/10">
            <h3 className="font-headline-sm text-sm font-bold text-primary">Bengaluru Ward Quality Ranking</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-lowest">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-tertiary-fixed-dim text-on-tertiary-fixed font-bold text-xs flex items-center justify-center">
                    1
                  </span>
                  <span className="font-label-md font-bold text-on-surface">Indiranagar (Ward 112)</span>
                </div>
                <span className="font-label-md font-extrabold text-emerald-700">88 Score</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-lowest">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-surface-container-high text-secondary font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <span className="font-label-md font-bold text-on-surface">Koramangala (Ward 151)</span>
                </div>
                <span className="font-label-md font-extrabold text-primary">76 Score</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-lowest">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-surface-container-high text-secondary font-bold text-xs flex items-center justify-center">
                    3
                  </span>
                  <span className="font-label-md font-bold text-on-surface">Whitefield (Ward 84)</span>
                </div>
                <span className="font-label-md font-extrabold text-amber-700">62 Score</span>
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
