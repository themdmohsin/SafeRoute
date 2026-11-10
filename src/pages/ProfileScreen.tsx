import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader.tsx';
import BottomNav from '../components/BottomNav.tsx';
import Toast from '../components/Toast.tsx';
import { useAuth, type UserPreferences } from '../auth/AuthContext';
import { apiRequest } from '../lib/api';

interface Stats {
  reports: number; confirmed: number; resolved: number; rides: number; km: number; points: number;
  badges: Array<{ id: string; name: string; hint: string; earned: boolean }>;
}
interface ExportHazard { _id: string; createdAt: string; hazardType: string; severity: string; status: string; roadName?: string; area?: string; description: string; location: { coordinates: [number, number] } }

const BADGE_ICON: Record<string, string> = { 'pothole-hunter': '🏆', 'night-sentinel': '🌙', 'rain-rider': '🌧️', 'verified-citizen': '🛡️' };
const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { logout, user, updateProfile } = useAuth();
  const prefs: UserPreferences = user?.preferences ?? { audibleAlerts: true, autoDetect: true, anonymousTelemetry: true, nightMap: false };
  const [stats, setStats] = useState<Stats | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: '', vehicleType: '', vehicleNumber: '', homeArea: '' });
  const [isSaving, setIsSaving] = useState(false);

  const [toastMessage, setToastMessage] = useState('');
  const [isToastOpen, setIsToastOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setIsToastOpen(true);
  };

  useEffect(() => {
    apiRequest<Stats>('/auth/me/stats').then(setStats).catch((e) => showToast(e instanceof Error ? e.message : 'Could not load your stats.'));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const togglePref = async (key: keyof UserPreferences) => {
    try {
      await updateProfile({ preferences: { [key]: !prefs[key] } });
      showToast('Preference saved.');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not save preference.');
    }
  };

  const openEditor = () => {
    setForm({ name: user?.name || '', vehicleType: user?.vehicleType || '', vehicleNumber: user?.vehicleNumber || '', homeArea: user?.homeArea || '' });
    setIsEditing(true);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast('Name cannot be empty.'); return; }
    setIsSaving(true);
    try {
      await updateProfile(form);
      setIsEditing(false);
      showToast('Profile saved.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const { hazards } = await apiRequest<{ hazards: ExportHazard[] }>('/hazards?mine=true&limit=100');
      if (!hazards.length) { showToast('You have not reported any hazards yet.'); return; }
      const header = ['Reported at', 'Type', 'Severity', 'Status', 'Road', 'Area', 'Latitude', 'Longitude', 'Description'];
      const rows = hazards.map((h) => [h.createdAt, h.hazardType, h.severity, h.status, h.roadName, h.area, h.location.coordinates[1], h.location.coordinates[0], h.description]);
      const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `saferoute-reports-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      showToast(`Downloaded ${hazards.length} reports.`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Export failed.');
    }
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
                    {user?.name?.split(' ').map((part) => part[0]).join('').slice(0, 2) || 'SR'}
                  </div>
                </div>
                <span className="absolute bottom-0 right-0 px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold shadow">
                  Account
                </span>
              </div>

              <div className="flex flex-col flex-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h2 className="font-headline-lg-mobile text-xl font-bold text-on-primary">{user?.name || 'SafeRoute Commuter'}</h2>
                  <span className="material-symbols-outlined text-tertiary-fixed text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified
                  </span>
                </div>
                <p className="font-body-sm text-xs text-primary-fixed">{user?.email}</p>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-lowest/20 backdrop-blur-md text-xs text-on-primary font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim"></span>
                    {user?.role || 'commuter'} account
                  </span>
                  {user?.homeArea && <span className="text-xs text-primary-fixed-dim">• {user.homeArea}</span>}
                </div>
              </div>
            </div>

            {/* Profile Counter Matrix */}
            <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-primary-fixed-dim/20 text-center">
              <div>
                <span className="font-display text-xl font-bold text-on-primary">{stats?.reports ?? '—'}</span>
                <p className="text-[11px] text-primary-fixed mt-0.5">Reports</p>
              </div>
              <div className="border-x border-primary-fixed-dim/20">
                <span className="font-display text-xl font-bold text-tertiary-fixed-dim">{stats?.resolved ?? '—'}</span>
                <p className="text-[11px] text-primary-fixed mt-0.5">Fixed after your report</p>
              </div>
              <div>
                <span className="font-display text-xl font-bold text-on-primary">{stats?.points ?? '—'}</span>
                <p className="text-[11px] text-primary-fixed mt-0.5">Points · {stats ? `${stats.rides} rides, ${stats.km} km` : ''}</p>
              </div>
            </div>
          </div>

          {/* Commuter Badges Row */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-sm font-bold text-primary">Badges</h3>
              <span className="text-xs text-secondary font-semibold">{stats ? `${stats.badges.filter((b) => b.earned).length} of ${stats.badges.length} earned` : ''}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(stats?.badges ?? []).map((badge) => (
                <div
                  key={badge.id}
                  title={badge.earned ? 'Earned' : `How to earn: ${badge.hint}`}
                  className={`flex flex-col items-center p-2.5 rounded-2xl bg-surface-container-low text-center gap-1 border border-outline-variant/10 ${badge.earned ? '' : 'opacity-40 grayscale'}`}
                >
                  <span className="text-2xl">{BADGE_ICON[badge.id]}</span>
                  <span className="text-[10px] font-bold text-on-surface leading-tight">{badge.name}</span>
                  {!badge.earned && <span className="text-[9px] text-secondary leading-tight">{badge.hint}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Vehicle Profile Card */}
          <div className="bg-surface-container-low rounded-2xl p-4 shadow-sm flex items-center justify-between border border-outline-variant/10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">two_wheeler</span>
              </div>
              <div>
                <p className="font-label-md font-bold text-on-surface">{user?.vehicleType || 'No vehicle type set'}</p>
                <p className="font-body-sm text-xs text-secondary font-mono">{user?.vehicleNumber || 'No registration number'}</p>
              </div>
            </div>
            <button
              aria-label="Edit profile and vehicle"
              onClick={openEditor}
              className="text-primary hover:text-surface-tint p-1.5 rounded-lg active:bg-surface-container cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
          </div>

          {/* Settings & Telemetry Preferences */}
          <div className="bg-surface-container-low rounded-3xl p-4 shadow-sm flex flex-col gap-4 border border-outline-variant/10">
            <h3 className="font-headline-sm text-sm font-bold text-primary">Preferences (saved to your account)</h3>

            <div className="flex flex-col gap-3">
              {/* Toggle 1: Audible Alerts */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-label-md text-sm font-semibold text-on-surface">Voice hazard alerts</p>
                  <p className="font-body-sm text-xs text-secondary">Spoken warnings 200 m before reported hazards during a ride</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    checked={prefs.audibleAlerts}
                    onChange={() => togglePref('audibleAlerts')}
                    className="sr-only peer"
                    type="checkbox"
                  />
                  <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                </label>
              </div>

              {/* Toggle 2: Auto-detect bumps */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-label-md text-sm font-semibold text-on-surface">Auto-detect bumps and potholes</p>
                  <p className="font-body-sm text-xs text-secondary">Default for the auto-detect switch when you start a ride</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    checked={prefs.autoDetect}
                    onChange={() => togglePref('autoDetect')}
                    className="sr-only peer"
                    type="checkbox"
                  />
                  <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                </label>
              </div>

              {/* Toggle 3: Anonymous Telemetry */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-label-md text-sm font-semibold text-on-surface">Save ride GPS tracks</p>
                  <p className="font-body-sm text-xs text-secondary">Keep your route for replay. Off: only ride totals are saved</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    checked={prefs.anonymousTelemetry}
                    onChange={() => togglePref('anonymousTelemetry')}
                    className="sr-only peer"
                    type="checkbox"
                  />
                  <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                </label>
              </div>

              {/* Toggle 4: Dark Map Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-label-md text-sm font-semibold text-on-surface">Night map theme</p>
                  <p className="font-body-sm text-xs text-secondary">Darker map tiles for riding after dark</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    checked={prefs.nightMap}
                    onChange={() => togglePref('nightMap')}
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
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="w-full h-12 rounded-2xl bg-primary text-on-primary font-label-md font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                <span>Open admin console</span>
              </button>
            )}
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

      {isEditing && (
        <div className="fixed inset-0 z-[60] bg-primary/60 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
          <form onSubmit={saveProfile} className="w-full max-w-md rounded-3xl bg-surface-container-lowest p-5 flex flex-col gap-3">
            <h2 id="edit-profile-title" className="text-lg font-bold text-primary">Edit profile</h2>
            {([
              ['name', 'Name', 'Your name'],
              ['vehicleType', 'Vehicle', 'e.g. Scooter, Car, Bicycle'],
              ['vehicleNumber', 'Registration number', 'e.g. KA-01-AB-1234'],
              ['homeArea', 'Home area', 'e.g. Indiranagar'],
            ] as const).map(([key, label, placeholder]) => (
              <label key={key} className="text-xs font-semibold text-secondary flex flex-col gap-1">
                {label}
                <input
                  value={form[key]}
                  placeholder={placeholder}
                  maxLength={key === 'vehicleNumber' ? 20 : 120}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="h-11 rounded-xl bg-surface-container-low px-3 text-sm text-on-surface focus:outline-2 focus:outline-primary"
                />
              </label>
            ))}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={() => setIsEditing(false)} className="h-11 rounded-xl bg-surface-container-high font-semibold cursor-pointer">Cancel</button>
              <button type="submit" disabled={isSaving} className="h-11 rounded-xl bg-primary text-on-primary font-bold cursor-pointer disabled:opacity-60">{isSaving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </form>
        </div>
      )}

      <BottomNav />
      <Toast message={toastMessage} icon="check_circle" isOpen={isToastOpen} onClose={() => setIsToastOpen(false)} />
    </div>
  );
}
