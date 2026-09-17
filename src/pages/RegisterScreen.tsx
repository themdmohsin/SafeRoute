import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader.tsx';
import Toast from '../components/Toast.tsx';

const LOGO_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1V3VxtXLXZ-OxUo3gXxROVH0esZPHsa8waby3mZRV_KH4FdKX9FTkgN5s9TeZijNrI0FM7vQpgZzC2P7KXLwFsidJ6HPzM5C6mBZH6W5K-MDnTcH0pDViUCt9nJw9_-3Fh9tcrUJceZ0LvBZ2mTdiPdF87b0vex19uYyMdpCanjjWygeGurlteazL-Xnkt1TDVbtXVTAinw2J7safTglr5Qfj6Bikd2n43Okj2vQuarDiqvKBb-fTL5j3A';

export default function RegisterScreen() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('Ananya Rao');
  const [email, setEmail] = useState('ananya.rao@example.com');
  const [password, setPassword] = useState('BengaluruSafe@2025!');
  const [confirmPassword, setConfirmPassword] = useState('BengaluruSafe@2025!');
  const [showPassword, setShowPassword] = useState(false);
  const [telemetryConsent, setTelemetryConsent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [toastMessage, setToastMessage] = useState('');
  const [isToastOpen, setIsToastOpen] = useState(false);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setIsToastOpen(true);
  };

  const isPasswordMatch = password.length > 0 && password === confirmPassword;

  const calculateStrength = (pwd: string) => {
    if (pwd.length === 0) return { label: 'Empty', bars: 0, color: 'bg-outline-variant' };
    if (pwd.length < 6) return { label: 'Weak', bars: 1, color: 'bg-error' };
    if (pwd.length < 10) return { label: 'Fair', bars: 2, color: 'bg-tertiary-fixed-dim' };
    if (pwd.length < 14) return { label: 'Good', bars: 3, color: 'bg-on-tertiary-container' };
    return { label: 'Strong', bars: 4, color: 'bg-on-tertiary-container' };
  };

  const strength = calculateStrength(password);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 alphanumeric characters');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      showNotification('Profile registered! Welcome to SafeRoute Bengaluru.');
      setTimeout(() => {
        setIsSubmitting(false);
        navigate('/home');
      }, 700);
    }, 1000);
  };

  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-secondary-container">
      {/* Header with Title FIXED to "Register" */}
      <AppHeader title="Register" variant="subpage" onBack={() => navigate('/login')} />

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-safe bg-surface max-w-lg mx-auto">
        <div className="flex flex-col w-full">
          <div className="relative px-margin pt-space-md pb-space-xl flex flex-col gap-space-lg overflow-hidden">
            {/* Ambient Civic Glow Shapes */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-tertiary-fixed-dim/20 blur-3xl pointer-events-none"></div>
            <div className="absolute top-1/3 -left-16 w-52 h-52 rounded-full bg-primary-fixed-dim/25 blur-3xl pointer-events-none"></div>

            {/* Header Hero Branding Card */}
            <div className="relative z-10 flex flex-col items-center text-center gap-space-xs pt-space-xs">
              <div className="relative group">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-tertiary-container to-tertiary-fixed-dim opacity-40 blur-sm"></div>
                <div className="relative w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <img alt="SafeRoute Badge" className="w-11 h-11 object-contain" src={LOGO_URL} />
                </div>
              </div>
              <div className="mt-space-sm flex flex-col items-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tertiary-container/10 text-on-tertiary-container mb-1">
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified
                  </span>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider">Bengaluru Civic Network</span>
                </div>
                <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-primary font-bold">Join SafeRoute</h2>
                <p className="font-body-md text-body-md text-secondary mt-1 max-w-[280px]">
                  Make Bengaluru roads safer for every commuter
                </p>
              </div>
            </div>

            {/* Glassmorphic Registration Form Panel */}
            <div className="relative z-10 rounded-3xl bg-surface-container-lowest/90 backdrop-blur-xl shadow-xl shadow-primary/5 p-space-lg flex flex-col gap-space-md border border-outline-variant/20">
              <form onSubmit={handleRegister} className="flex flex-col gap-space-md">
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-error-container text-on-error-container text-body-sm font-medium flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Field: Full Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface flex items-center justify-between" htmlFor="reg-name">
                    <span>Full Name</span>
                    <span className="font-body-sm text-body-sm text-secondary">Public alias</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-secondary text-[20px] pointer-events-none">
                      person
                    </span>
                    <input
                      className="w-full h-12 bg-surface-container-low text-on-surface font-body-md text-body-md rounded-xl pl-11 pr-4 outline-none focus:bg-surface-container transition-all"
                      id="reg-name"
                      required
                      placeholder="e.g. Ananya Rao"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Field: Email Address */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface flex items-center justify-between" htmlFor="reg-email">
                    <span>Email Address</span>
                    <span className="font-body-sm text-body-sm text-secondary">For civic updates</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-secondary text-[20px] pointer-events-none">
                      mail
                    </span>
                    <input
                      className="w-full h-12 bg-surface-container-low text-on-surface font-body-md text-body-md rounded-xl pl-11 pr-4 outline-none focus:bg-surface-container transition-all"
                      id="reg-email"
                      required
                      placeholder="e.g. ananya@domain.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Field: Password & Strength Meter */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface flex items-center justify-between" htmlFor="reg-pass">
                    <span>Password</span>
                    <span className="font-label-sm text-label-sm text-on-tertiary-container font-bold" id="strength-label">
                      {strength.label}
                    </span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-secondary text-[20px] pointer-events-none">
                      lock
                    </span>
                    <input
                      className="w-full h-12 bg-surface-container-low text-on-surface font-body-md text-body-md rounded-xl pl-11 pr-11 outline-none focus:bg-surface-container transition-all"
                      id="reg-pass"
                      required
                      placeholder="Min. 8 alphanumeric characters"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      aria-label="Toggle password visibility"
                      className="absolute right-3 w-7 h-7 flex items-center justify-center text-secondary hover:text-on-surface transition-colors cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>

                  {/* Segmented Strength Meter */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {[1, 2, 3, 4].map((bar) => (
                      <div
                        key={bar}
                        className={`h-1.5 rounded-full transition-colors ${
                          bar <= strength.bars ? strength.color : 'bg-surface-container-highest'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Field: Confirm Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface flex items-center justify-between" htmlFor="reg-confirm-pass">
                    <span>Confirm Password</span>
                    {isPasswordMatch ? (
                      <span className="font-label-sm text-label-sm text-on-tertiary-container flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span> Matches
                      </span>
                    ) : (
                      <span className="font-label-sm text-label-sm text-secondary">Check match</span>
                    )}
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-secondary text-[20px] pointer-events-none">
                      shield
                    </span>
                    <input
                      className="w-full h-12 bg-surface-container-low text-on-surface font-body-md text-body-md rounded-xl pl-11 pr-11 outline-none focus:bg-surface-container transition-all"
                      id="reg-confirm-pass"
                      required
                      placeholder="Re-enter your password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {isPasswordMatch && (
                      <div className="absolute right-3.5 w-5 h-5 rounded-full bg-tertiary-container/15 flex items-center justify-center text-on-tertiary-container pointer-events-none">
                        <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          check
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Telemetry Consent Checkbox */}
                <div className="pt-space-xs">
                  <label className="flex items-start gap-space-sm p-space-sm rounded-2xl bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer select-none">
                    <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                      <input
                        checked={telemetryConsent}
                        onChange={(e) => setTelemetryConsent(e.target.checked)}
                        className="peer sr-only"
                        id="telemetry-consent"
                        type="checkbox"
                      />
                      <div className="w-5 h-5 rounded-lg bg-surface-container-highest peer-checked:bg-primary transition-all flex items-center justify-center shadow-inner">
                        <span className="material-symbols-outlined text-[15px] text-on-primary scale-0 peer-checked:scale-100 transition-transform duration-150">
                          check
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-body-sm text-body-sm text-on-surface font-semibold">Civic Data Contribution</span>
                      <span className="font-body-sm text-body-sm text-secondary leading-snug">
                        I agree to contribute anonymous road pothole telemetry and safety data to help improve urban transit.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Primary CTA Button */}
                <div className="pt-space-xs flex flex-col items-center">
                  <button
                    className="relative w-full h-[52px] rounded-2xl bg-primary text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 shadow-[0_8px_20px_-4px_rgba(221,146,2,0.45)] hover:bg-primary-container active:scale-[0.98] transition-all overflow-hidden group cursor-pointer disabled:opacity-75"
                    id="btn-register"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-tertiary-fixed-dim/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"></div>
                    <span className="material-symbols-outlined text-[20px] text-tertiary-fixed-dim">
                      {isSubmitting ? 'sync' : 'sensor_occupied'}
                    </span>
                    <span>{isSubmitting ? 'Securing Commuter Profile...' : 'Create Account'}</span>
                  </button>
                </div>

                {/* Bottom Navigation Link */}
                <div className="flex items-center justify-center pt-space-xs text-center">
                  <p className="font-body-sm text-body-sm text-secondary">
                    Already have an account?{' '}
                    <button
                      type="button"
                      className="font-label-md text-label-md text-primary hover:text-on-tertiary-container font-semibold inline-flex items-center gap-0.5 ml-1 transition-colors cursor-pointer bg-transparent border-none p-0"
                      onClick={() => navigate('/login')}
                    >
                      Log in
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  </p>
                </div>
              </form>
            </div>

            {/* Micro-Trust Indicators */}
            <div className="relative z-10 flex items-center justify-center gap-space-sm text-secondary">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-on-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified_user
                </span>
                <span className="font-label-sm text-label-sm font-semibold">256-bit encrypted</span>
              </div>
              <span className="w-1 h-1 rounded-full bg-secondary-fixed-dim"></span>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-secondary">location_off</span>
                <span className="font-label-sm text-label-sm font-semibold">Anonymous GPS logs</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Toast message={toastMessage} icon="check_circle" isOpen={isToastOpen} onClose={() => setIsToastOpen(false)} />
    </div>
  );
}
