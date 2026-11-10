import React, { useEffect, useState } from 'react';
import AppHeader from '../components/AppHeader.tsx';
import Toast from '../components/Toast.tsx';
import { apiRequest } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

interface AdminHazard {
  _id: string;
  hazardType: string;
  severity: string;
  description: string;
  area?: string;
  roadName?: string;
  status: 'reported' | 'verified' | 'resolved';
  source: string;
  createdAt: string;
  reportedBy?: { name: string } | null;
}
interface AdminUser { id: string; name: string; email: string; role: 'commuter' | 'admin'; reportCount: number; createdAt: string }
interface ContactMessage { _id: string; name: string; email: string; message: string; createdAt: string }

type Tab = 'reports' | 'users' | 'messages';
const fieldClass = 'rounded-lg border border-outline-variant bg-white p-2 text-sm text-on-surface';

export default function AdminScreen() {
  const { user: me } = useAuth();
  const [tab, setTab] = useState<Tab>('reports');
  const [statusFilter, setStatusFilter] = useState('reported');
  const [hazards, setHazards] = useState<AdminHazard[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const fail = (err: unknown) => setError(err instanceof Error ? err.message : 'Request failed.');

  useEffect(() => {
    setError('');
    if (tab === 'reports') {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter) params.set('status', statusFilter);
      apiRequest<{ hazards: AdminHazard[] }>(`/hazards?${params}`).then((r) => setHazards(r.hazards)).catch(fail);
    } else if (tab === 'users') {
      apiRequest<{ users: AdminUser[] }>('/admin/users').then((r) => setUsers(r.users)).catch(fail);
    } else {
      apiRequest<{ messages: ContactMessage[] }>('/admin/messages').then((r) => setMessages(r.messages)).catch(fail);
    }
  }, [tab, statusFilter]);

  const setStatus = async (hazard: AdminHazard, status: AdminHazard['status']) => {
    try {
      await apiRequest(`/hazards/${hazard._id}`, { method: 'PATCH', body: { status } });
      // Drop it from the list when it no longer matches the filter.
      setHazards((list) => (statusFilter && status !== statusFilter
        ? list.filter((h) => h._id !== hazard._id)
        : list.map((h) => (h._id === hazard._id ? { ...h, status } : h))));
      setToast(`Report marked ${status}.`);
    } catch (err) { fail(err); }
  };

  const remove = async (hazard: AdminHazard) => {
    if (!window.confirm('Delete this report for good? This cannot be undone.')) return;
    try {
      await apiRequest(`/hazards/${hazard._id}`, { method: 'DELETE' });
      setHazards((list) => list.filter((h) => h._id !== hazard._id));
      setToast('Report deleted.');
    } catch (err) { fail(err); }
  };

  const setRole = async (target: AdminUser, role: AdminUser['role']) => {
    try {
      await apiRequest(`/admin/users/${target.id}`, { method: 'PATCH', body: { role } });
      setUsers((list) => list.map((u) => (u.id === target.id ? { ...u, role } : u)));
      setToast(`${target.name} is now ${role === 'admin' ? 'an admin' : 'a commuter'}.`);
    } catch (err) { fail(err); }
  };

  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-screen flex flex-col">
      <AppHeader title="Admin console" variant="subpage" />
      <main className="flex-1 w-full max-w-3xl mx-auto px-margin pt-20 pb-10 flex flex-col gap-4">
        <div>
          <h1 className="font-headline-lg-mobile text-2xl font-bold text-primary">Admin console</h1>
          <p className="text-sm text-secondary">Check new reports, manage who has admin access, and read contact messages.</p>
        </div>

        <div role="tablist" className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-container-low p-1">
          {(['reports', 'users', 'messages'] as Tab[]).map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`rounded-xl py-2 text-sm font-semibold capitalize cursor-pointer focus-visible:outline-2 focus-visible:outline-primary ${tab === key ? 'bg-primary text-on-primary' : 'text-secondary hover:text-on-surface'}`}
            >
              {key}
            </button>
          ))}
        </div>

        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}

        {tab === 'reports' && (
          <section className="flex flex-col gap-3">
            <label className="text-xs font-semibold text-secondary flex items-center gap-2">Show
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={fieldClass}>
                <option value="reported">Waiting for review</option>
                <option value="verified">Verified</option>
                <option value="resolved">Resolved</option>
                <option value="">All reports</option>
              </select>
            </label>
            {hazards.length ? hazards.map((h) => (
              <article key={h._id} className="rounded-2xl bg-surface-container-low p-4 border border-outline-variant/10 flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-on-surface">{[h.roadName, h.area].filter(Boolean).join(', ') || 'Unspecified area'}</h2>
                  <span className="text-xs text-secondary">{h.hazardType.replaceAll('_', ' ')}, {h.severity} severity, {h.source}</span>
                </div>
                <p className="text-sm text-secondary">{h.description}</p>
                <p className="text-xs text-secondary">
                  Reported by {h.reportedBy?.name || 'automatic detection'} on <time dateTime={h.createdAt}>{new Date(h.createdAt).toLocaleString()}</time>
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <label className="text-xs font-semibold text-secondary flex items-center gap-2">Status
                    <select value={h.status} onChange={(e) => setStatus(h, e.target.value as AdminHazard['status'])} className={fieldClass}>
                      <option value="reported">Reported</option>
                      <option value="verified">Verified</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </label>
                  <button onClick={() => remove(h)} className="ml-auto rounded-lg px-3 py-2 text-sm font-semibold text-error hover:bg-error-container/40 cursor-pointer">
                    Delete report
                  </button>
                </div>
              </article>
            )) : <p className="text-sm text-secondary">No reports with this status.</p>}
          </section>
        )}

        {tab === 'users' && (
          <section className="overflow-x-auto rounded-2xl bg-surface-container-low border border-outline-variant/10">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-secondary">
                <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3 text-right">Reports</th><th className="p-3">Role</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-outline-variant/20">
                    <td className="p-3 font-semibold">{u.name}</td>
                    <td className="p-3 text-secondary">{u.email}</td>
                    <td className="p-3 text-right">{u.reportCount}</td>
                    <td className="p-3">
                      <select
                        aria-label={`Role for ${u.name}`}
                        value={u.role}
                        disabled={u.id === me?.id}
                        title={u.id === me?.id ? 'You cannot change your own role.' : undefined}
                        onChange={(e) => setRole(u, e.target.value as AdminUser['role'])}
                        className={`${fieldClass} disabled:opacity-60`}
                      >
                        <option value="commuter">Commuter</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!users.length && <p className="p-3 text-sm text-secondary">No users yet.</p>}
          </section>
        )}

        {tab === 'messages' && (
          <section className="flex flex-col gap-3">
            {messages.length ? messages.map((m) => (
              <article key={m._id} className="rounded-2xl bg-surface-container-low p-4 border border-outline-variant/10">
                <div className="flex flex-wrap justify-between gap-2 text-xs text-secondary">
                  <a href={`mailto:${m.email}`} className="font-semibold text-primary hover:underline">{m.name} ({m.email})</a>
                  <time dateTime={m.createdAt}>{new Date(m.createdAt).toLocaleString()}</time>
                </div>
                <p className="mt-2 text-sm whitespace-pre-wrap">{m.message}</p>
              </article>
            )) : <p className="text-sm text-secondary">No messages yet.</p>}
          </section>
        )}
      </main>
      <Toast message={toast} icon="check_circle" isOpen={Boolean(toast)} onClose={() => setToast('')} />
    </div>
  );
}
