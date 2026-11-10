import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader.tsx';
import { apiRequest } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

// Two steps on one page: no ?token -> ask for email; with ?token -> choose a new password.
export default function ResetPasswordScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const requestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address.'); return; }
    setBusy(true);
    try {
      const r = await apiRequest<{ message: string }>('/auth/forgot-password', { method: 'POST', body: { email } });
      setMessage(r.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not request a reset link.');
    } finally { setBusy(false); }
  };

  const setNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('The two passwords do not match.'); return; }
    setBusy(true);
    try {
      await resetPassword(token as string, password);
      navigate('/home', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset the password.');
    } finally { setBusy(false); }
  };

  const field = 'w-full h-12 rounded-xl bg-surface-container-low px-4 text-on-surface focus:outline-2 focus:outline-primary';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title="Reset password" variant="subpage" onBack={() => navigate('/login')} />
      <main className="flex-1 w-full max-w-md mx-auto px-6 pt-24 flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-primary">{token ? 'Choose a new password' : 'Forgot your password?'}</h1>
        {!token && !message && (
          <form onSubmit={requestLink} className="flex flex-col gap-3" noValidate>
            <p className="text-sm text-secondary">Enter your account email and we will create a reset link valid for 30 minutes.</p>
            <label className="text-sm font-semibold text-secondary" htmlFor="reset-email">Email</label>
            <input id="reset-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
            <button disabled={busy} className="h-12 rounded-xl bg-primary text-on-primary font-bold cursor-pointer disabled:opacity-60">{busy ? 'Sending…' : 'Send reset link'}</button>
          </form>
        )}
        {!token && message && (
          <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
            {message}
            <p className="mt-2 text-xs">Running locally? The link is printed in the terminal where the server runs.</p>
          </div>
        )}
        {token && (
          <form onSubmit={setNewPassword} className="flex flex-col gap-3" noValidate>
            <label className="text-sm font-semibold text-secondary" htmlFor="new-password">New password</label>
            <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
            <label className="text-sm font-semibold text-secondary" htmlFor="confirm-password">Repeat new password</label>
            <input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
            <button disabled={busy} className="h-12 rounded-xl bg-primary text-on-primary font-bold cursor-pointer disabled:opacity-60">{busy ? 'Saving…' : 'Save password and log in'}</button>
          </form>
        )}
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        <button onClick={() => navigate('/login')} className="text-sm font-semibold text-primary hover:underline cursor-pointer self-start">Back to log in</button>
      </main>
    </div>
  );
}
