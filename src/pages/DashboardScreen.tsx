import React, { useEffect, useState } from 'react';
import AppHeader from '../components/AppHeader.tsx';
import BottomNav from '../components/BottomNav.tsx';
import Toast from '../components/Toast.tsx';
import AssistantChat from '../components/AssistantChat.tsx';
import { apiRequest } from '../lib/api';

interface AnalyticsData {
  totalHazards: number;
  hazardsByDay: Array<{ date: string; count: number }>;
  topHazardZones: Array<{ zone: string; area: string; roadName: string; count: number }>;
  severityBreakdown: Array<{ severity: string; count: number }>;
  typeBreakdown: Array<{ key: string; count: number }>;
  statusBreakdown: Array<{ key: string; count: number }>;
  sourceBreakdown: Array<{ key: string; count: number }>;
}

const pretty = (key: string) => key.replaceAll('_', ' ').replace('-', ' ').replace(/^\w/, (c) => c.toUpperCase());
const SEVERITY_COLOR: Record<string, string> = { low: 'bg-emerald-600', medium: 'bg-amber-500', high: 'bg-error' };

// Horizontal bars; widths are relative to the largest row so small counts stay visible.
function BarList({ rows, color }: { rows: Array<{ key: string; count: number }>; color: string }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li key={row.key} className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-2 text-xs">
          <span className="truncate font-semibold text-on-surface">{pretty(row.key)}</span>
          <span className="h-3 rounded-full bg-surface-container-high overflow-hidden">
            <span className={`block h-full rounded-full ${color}`} style={{ width: `${(row.count / max) * 100}%` }} />
          </span>
          <span className="text-right font-bold text-on-surface">{row.count}</span>
        </li>
      ))}
    </ul>
  );
}

function ChartCard({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface-container-low rounded-3xl p-4 shadow-sm flex flex-col gap-3 border border-outline-variant/10">
      <div>
        <h3 className="font-headline-sm text-sm font-bold text-primary">{title}</h3>
        <p className="font-body-sm text-xs text-secondary">{note}</p>
      </div>
      {children}
    </section>
  );
}

interface HazardFeedItem {
  _id: string;
  hazardType: string;
  severity: string;
  description: string;
  area?: string;
  roadName?: string;
  status: string;
  createdAt: string;
}

export default function DashboardScreen() {
  const [dateRange, setDateRange] = useState('7');
  const [hazardType, setHazardType] = useState('');
  const [severity, setSeverity] = useState('');
  const [area, setArea] = useState('');
  const [summary, setSummary] = useState<AnalyticsData | null>(null);
  const [recentHazards, setRecentHazards] = useState<HazardFeedItem[]>([]);
  const [analyticsError, setAnalyticsError] = useState('');
  const [refreshCount, setRefreshCount] = useState(0);
  const [toastMessage, setToastMessage] = useState('');
  const [isToastOpen, setIsToastOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setIsToastOpen(true);
  };

  useEffect(() => {
    const params = new URLSearchParams();
    if (dateRange !== 'all') {
      const end = new Date();
      const start = new Date(Date.now() - Number(dateRange) * 24 * 60 * 60 * 1000);
      params.set('startDate', start.toISOString().slice(0, 10));
      params.set('endDate', end.toISOString().slice(0, 10));
    }
    if (hazardType) params.set('hazardType', hazardType);
    if (severity) params.set('severity', severity);
    if (area.trim()) params.set('area', area.trim());
    apiRequest<AnalyticsData>(`/analytics/summary?${params.toString()}`)
      .then((result) => { setSummary(result); setAnalyticsError(''); })
      .catch((error) => setAnalyticsError(error instanceof Error ? error.message : 'Could not load analytics.'));
    const hazardParams = new URLSearchParams(params);
    hazardParams.set('limit', '3');
    hazardParams.set('page', '1');
    apiRequest<{ hazards: HazardFeedItem[] }>(`/hazards?${hazardParams.toString()}`)
      .then(({ hazards }) => setRecentHazards(hazards))
      .catch((error) => setAnalyticsError(error instanceof Error ? error.message : 'Could not load recent reports.'));
  }, [dateRange, hazardType, severity, area, refreshCount]);

  const highCount = summary?.severityBreakdown.find((item) => item.severity === 'high')?.count || 0;
  const chartRows = summary?.hazardsByDay.slice(-7) || [];
  const chartMax = Math.max(1, ...chartRows.map((item) => item.count));
  const total = summary?.totalHazards || 0;
  const statusCount = (key: string) => summary?.statusBreakdown.find((item) => item.key === key)?.count || 0;
  const resolvedPct = total ? Math.round((statusCount('resolved') / total) * 100) : 0;

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
                MongoDB Reports
              </span>
            </div>
            <h1 className="font-headline-lg-mobile text-2xl sm:text-3xl text-primary font-bold tracking-tight">
              Road Health Analytics
            </h1>
            <p className="font-body-sm text-secondary">
              Reports submitted to SafeRoute. Date, hazard, severity, and area filters run on the server.
            </p>
          </div>

          <section className="grid grid-cols-3 gap-2 rounded-2xl bg-surface-container-low p-3">
            <label className="text-xs font-semibold text-secondary">Date range
              <select value={dateRange} onChange={(event) => setDateRange(event.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant bg-white p-2 text-sm text-on-surface">
                <option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="all">All time</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-secondary">Hazard type
              <select value={hazardType} onChange={(event) => setHazardType(event.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant bg-white p-2 text-sm text-on-surface">
                <option value="">All types</option><option value="pothole">Potholes</option><option value="waterlogging">Waterlogging</option><option value="open_manhole">Open manholes</option><option value="speed_breaker">Speed breakers</option><option value="other">Other</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-secondary">Severity
              <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant bg-white p-2 text-sm text-on-surface">
                <option value="">All levels</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </label>
            <label className="col-span-3 text-xs font-semibold text-secondary">Area or road
              <input value={area} onChange={(event) => setArea(event.target.value)} placeholder="All areas" className="mt-1 w-full rounded-lg border border-outline-variant bg-white p-2 text-sm text-on-surface" />
            </label>
          </section>
          {analyticsError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{analyticsError}</p>}

          {/* Civic Safety Score Hero Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-container to-primary text-on-primary p-5 shadow-xl shadow-primary-container/20">
            <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-tertiary-fixed-dim/20 blur-2xl pointer-events-none"></div>

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="font-label-md text-xs text-primary-fixed font-semibold">
                  Resolution rate
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-2xl font-extrabold text-on-primary">{summary ? `${resolvedPct}%` : '—'}</span>
                </div>
                <p className="font-body-sm text-xs text-on-primary-container mt-1">
                  {statusCount('resolved')} of {total} filtered reports are fixed.
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
                    strokeDasharray={`${resolvedPct}, 100`}
                    strokeLinecap="round"
                    strokeWidth="3.5"
                  />
                </svg>
                <span className="absolute font-display text-xs font-bold text-on-primary">{resolvedPct}%</span>
              </div>
            </div>
          </div>

          {/* City-wide Road Health Stats (3 Grid Cards) */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-surface-container-low shadow-sm border border-outline-variant/10 flex flex-col">
              <span className="font-label-sm text-[11px] text-secondary font-semibold">Total reports</span>
              <span className="font-display text-xl font-bold text-on-surface mt-1">{summary?.totalHazards ?? '—'}</span>
              <span className="font-body-sm text-[10px] text-secondary mt-0.5">Filtered reports</span>
            </div>

            <div className="p-3 rounded-2xl bg-surface-container-low shadow-sm border border-outline-variant/10 flex flex-col">
              <span className="font-label-sm text-[11px] text-secondary font-semibold">Low severity</span>
              <span className="font-display text-xl font-bold text-emerald-700 mt-1">{summary?.severityBreakdown.find((item) => item.severity === 'low')?.count ?? '—'}</span>
              <span className="font-body-sm text-[10px] text-emerald-600 mt-0.5 font-medium">Low severity</span>
            </div>

            <div className="p-3 rounded-2xl bg-surface-container-low shadow-sm border border-outline-variant/10 flex flex-col">
              <span className="font-label-sm text-[11px] text-secondary font-semibold">Hotspots</span>
              <span className="font-display text-xl font-bold text-error mt-1">{highCount}</span>
              <span className="font-body-sm text-[10px] text-error mt-0.5 font-medium">High severity</span>
            </div>
          </div>

          {/* Filtered Hazard Trend Chart */}
          <div className="bg-surface-container-low rounded-3xl p-4 shadow-sm flex flex-col gap-3 border border-outline-variant/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-headline-sm text-sm font-bold text-primary">Hazard Reports by Day</h3>
                <p className="font-body-sm text-xs text-secondary">Updated from filtered MongoDB results</p>
              </div>
              <span className="font-label-sm text-xs px-2.5 py-1 rounded-full bg-surface-container-high text-primary font-semibold">
                {dateRange === 'all' ? 'All time' : `Last ${dateRange} days`}
              </span>
            </div>

            {/* Custom Bar Chart */}
            <div className="flex items-end justify-between h-40 pt-4 px-2">
              {!chartRows.length && <p className="w-full self-center text-center text-sm text-secondary">No daily reports for these filters.</p>}
              {chartRows.map((item) => {
                const label = new Date(`${item.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' });
                return (
                  <div
                    key={item.date}
                    className="flex flex-col items-center gap-1.5 flex-1 group"
                  >
                    <span
                      className={`text-[10px] font-semibold transition-opacity ${
                        'text-secondary opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {item.count}
                    </span>
                    <div className="w-8 max-w-full h-28 bg-surface-container-high rounded-xl flex items-end overflow-hidden p-0.5">
                      <div
                        className={`w-full rounded-lg transition-all duration-300 ${
                          'bg-primary/80 group-hover:bg-primary'
                        }`}
                        style={{ height: `${Math.max(8, (item.count / chartMax) * 100)}%` }}
                      ></div>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        'text-secondary'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="border-t border-outline-variant/10 pt-2 text-center text-xs text-secondary">Each bar shows reports created on that date.</p>
          </div>

          {summary && (
            <>
              <ChartCard title="Severity mix" note="Share of filtered reports at each severity level">
                <div className="flex h-4 w-full overflow-hidden rounded-full bg-surface-container-high" role="img" aria-label={summary.severityBreakdown.map((s) => `${s.severity}: ${s.count}`).join(', ')}>
                  {summary.severityBreakdown.map((s) => total > 0 && (
                    <span key={s.severity} className={SEVERITY_COLOR[s.severity]} style={{ width: `${(s.count / total) * 100}%` }} />
                  ))}
                </div>
                <ul className="flex justify-between text-xs">
                  {summary.severityBreakdown.map((s) => (
                    <li key={s.severity} className="flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${SEVERITY_COLOR[s.severity]}`} />
                      <span className="text-secondary">{pretty(s.severity)}</span>
                      <span className="font-bold text-on-surface">{total ? Math.round((s.count / total) * 100) : 0}%</span>
                    </li>
                  ))}
                </ul>
              </ChartCard>

              <ChartCard title="Reports by hazard type" note="Which road problems riders hit most">
                <BarList rows={summary.typeBreakdown} color="bg-primary/80" />
              </ChartCard>

              <ChartCard title="Repair pipeline" note="Where filtered reports sit, from first report to fixed">
                <ol className="grid grid-cols-3 gap-2">
                  {summary.statusBreakdown.map((s) => (
                    <li key={s.key} className="rounded-2xl bg-surface-container-lowest p-3 text-center">
                      <span className="block font-display text-xl font-bold text-on-surface">{s.count}</span>
                      <span className="text-xs text-secondary">{pretty(s.key)}</span>
                      <span className="mt-2 block h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                        <span className="block h-full bg-tertiary-fixed-dim" style={{ width: `${total ? (s.count / total) * 100 : 0}%` }} />
                      </span>
                    </li>
                  ))}
                </ol>
              </ChartCard>

              <ChartCard title="How hazards were found" note="Manual reports versus sensor and ML detection">
                <BarList rows={summary.sourceBreakdown} color="bg-secondary" />
              </ChartCard>
            </>
          )}

          {/* Recent reports are loaded from the API using the current dashboard filters. */}
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Recent Citizen Hazard Reports</h3>
              <button onClick={() => { setRefreshCount((value) => value + 1); showToast('Refreshed reports and analytics from MongoDB.'); }} className="font-label-sm text-surface-tint font-semibold hover:underline cursor-pointer flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">refresh</span> Refresh
              </button>
            </div>
            <div className="flex flex-col gap-2.5">
              {recentHazards.length ? recentHazards.map((hazard) => (
                <article key={hazard._id} className="p-3.5 rounded-2xl bg-surface-container-low flex flex-col gap-2 border border-outline-variant/10">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-label-sm text-xs font-semibold text-secondary">{hazard.hazardType.replaceAll('_', ' ')} · {hazard.severity}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-xs">{hazard.status}</span>
                  </div>
                  <h4 className="font-headline-sm text-sm font-bold text-on-surface">{[hazard.roadName, hazard.area].filter(Boolean).join(', ') || 'Unspecified area'}</h4>
                  <p className="font-body-sm text-xs text-secondary">{hazard.description}</p>
                  <time className="text-xs text-secondary" dateTime={hazard.createdAt}>{new Date(hazard.createdAt).toLocaleString()}</time>
                </article>
              )) : <p className="text-sm text-secondary">No reports match these filters.</p>}
            </div>
          </div>
          {/* Top hazard zones */}
          <div className="bg-surface-container-low rounded-3xl p-4 shadow-sm flex flex-col gap-3 border border-outline-variant/10">
            <h3 className="font-headline-sm text-sm font-bold text-primary">Top Hazard Zones</h3>
            {summary?.topHazardZones.length ? summary.topHazardZones.map((zone, index) => (
              <div key={`${zone.area}-${zone.roadName}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-lowest p-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-surface-container-high text-secondary font-bold text-xs flex items-center justify-center">{index + 1}</span>
                  <span className="font-label-md font-bold text-on-surface truncate">{zone.zone || zone.area || zone.roadName || 'Unspecified area'}</span>
                </div>
                <span className="font-label-md font-extrabold text-error shrink-0">{zone.count} reports</span>
              </div>
            )) : <p className="text-sm text-secondary">No hazard zones match these filters.</p>}
          </div>

        </div>
      </main>

      <AssistantChat />
      <BottomNav />
      <Toast message={toastMessage} icon="check_circle" isOpen={isToastOpen} onClose={() => setIsToastOpen(false)} />
    </div>
  );
}
