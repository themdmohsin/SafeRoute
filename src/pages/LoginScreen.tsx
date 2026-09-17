import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader.tsx';
import Toast from '../components/Toast.tsx';

const LOGO_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1V3VxtXLXZ-OxUo3gXxROVH0esZPHsa8waby3mZRV_KH4FdKX9FTkgN5s9TeZijNrI0FM7vQpgZzC2P7KXLwFsidJ6HPzM5C6mBZH6W5K-MDnTcH0pDViUCt9nJw9_-3Fh9tcrUJceZ0LvBZ2mTdiPdF87b0vex19uYyMdpCanjjWygeGurlteazL-Xnkt1TDVbtXVTAinw2J7safTglr5Qfj6Bikd2n43Okj2vQuarDiqvKBb-fTL5j3A';

export default function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('arjun.sharma@example.com');
  const [password, setPassword] = useState('BengaluruSafe#24');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [lockFocused, setLockFocused] = useState(false);

  const [toastMessage, setToastMessage] = useState('');
  const [toastIcon, setToastIcon] = useState('check_circle');
  const [isToastOpen, setIsToastOpen] = useState(false);

  const showNotification = (msg: string, icon = 'check_circle') => {
    setToastMessage(msg);
    setToastIcon(icon);
    setIsToastOpen(true);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Basic client-side validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address');
      showNotification('Please enter a valid email address', 'error');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      showNotification('Password must be at least 6 characters', 'warning');
      return;
    }

    setIsSubmitting(true);
    showNotification('Authenticating with Bengaluru Smart Mobility...', 'sync');

    setTimeout(() => {
      setIsSubmitting(false);
      navigate('/home');
    }, 900);
  };

  const triggerBiometrics = () => {
    showNotification('Biometric sensors active. Scanning fingerprint / Face ID...', 'fingerprint');
    setTimeout(() => {
      showNotification('Biometric identity confirmed! Welcome Arjun.', 'verified');
      setTimeout(() => {
        navigate('/home');
      }, 700);
    }, 800);
  };

  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-secondary-container">
      <AppHeader title="Login" variant="subpage" onBack={() => navigate('/')} />

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-safe bg-surface max-w-lg mx-auto">
        <div className="flex flex-col w-full px-margin pb-space-xl relative overflow-hidden">
          {/* Subtle Ambient Glowing Vector Background */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-to-b from-primary-fixed/40 via-tertiary-fixed-dim/15 to-transparent rounded-full blur-3xl pointer-events-none -z-10"></div>

          {/* Hero Branding Centerpiece */}
          <div className="flex flex-col items-center text-center mt-space-md mb-space-lg">
            <div className="relative mb-space-md">
              <div className="w-20 h-20 rounded-2xl bg-primary shadow-xl flex items-center justify-center relative z-10 overflow-hidden">
                <img alt="SafeRoute Pin Logo" className="w-16 h-16 object-contain" src={LOGO_URL} />
              </div>
              <div className="absolute inset-0 rounded-2xl bg-tertiary-container blur-md opacity-30 animate-pulse"></div>
            </div>
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-primary tracking-tight font-bold">
              Welcome Back
            </h2>
            <p className="font-body-md text-body-md text-secondary max-w-xs mt-space-xs">
              Log in to track & report road conditions across Bengaluru
            </p>
          </div>

          {/* Glassmorphic Login Card */}
          <div className="w-full bg-surface-container-lowest/90 backdrop-blur-md rounded-3xl p-space-lg shadow-xl shadow-primary/5 relative border border-outline-variant/20">
            <form className="flex flex-col gap-space-md" id="loginForm" onSubmit={handleLoginSubmit}>
              {errorMessage && (
                <div className="p-3 rounded-xl bg-error-container text-on-error-container text-body-sm font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Email Input Field */}
              <div className="flex flex-col gap-space-xs relative">
                <label className="font-label-md text-label-md text-secondary font-semibold pl-1" htmlFor="email">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <span
                    className={`material-symbols-outlined absolute left-4 text-[20px] pointer-events-none transition-colors ${
                      emailFocused ? 'text-primary' : 'text-secondary'
                    }`}
                    id="emailIcon"
                  >
                    mail
                  </span>
                  <input
                    className="w-full h-12 bg-surface-container-low text-on-surface font-body-md text-body-md rounded-xl pl-11 pr-4 outline-none transition-all placeholder:text-outline/60 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container"
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    placeholder="arjun.sharma@example.com"
                  />
                </div>
              </div>

              {/* Password Input Field */}
              <div className="flex flex-col gap-space-xs relative">
                <div className="flex items-center justify-between pl-1">
                  <label className="font-label-md text-label-md text-secondary font-semibold" htmlFor="password">
                    Password
                  </label>
                  <button
                    type="button"
                    className="font-label-md text-label-md text-on-tertiary-container font-bold hover:underline cursor-pointer bg-transparent border-none p-0"
                    onClick={() => showNotification('Password reset link dispatched via SMS & Email', 'mail')}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <span
                    className={`material-symbols-outlined absolute left-4 text-[20px] pointer-events-none transition-colors ${
                      lockFocused ? 'text-primary' : 'text-secondary'
                    }`}
                    id="lockIcon"
                  >
                    lock
                  </span>
                  <input
                    className="w-full h-12 bg-surface-container-low text-on-surface font-body-md text-body-md rounded-xl pl-11 pr-12 outline-none transition-all placeholder:text-outline/60 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container"
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setLockFocused(true)}
                    onBlur={() => setLockFocused(false)}
                    placeholder="••••••••••••"
                  />
                  <button
                    aria-label="Toggle password visibility"
                    className="absolute right-3 w-8 h-8 flex items-center justify-center text-secondary hover:text-on-surface rounded-lg transition-colors cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]" id="eyeIcon">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Log In Action Button */}
              <button
                className="w-full h-[52px] mt-space-xs bg-gradient-to-r from-primary to-primary-container text-on-primary font-label-lg text-label-lg font-bold rounded-2xl flex items-center justify-center gap-space-sm shadow-lg shadow-primary/25 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-75"
                id="loginBtn"
                type="submit"
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? 'Authenticating...' : 'Log In'}</span>
                <span className="material-symbols-outlined text-[20px]">
                  {isSubmitting ? 'sync' : 'arrow_forward'}
                </span>
              </button>

              {/* Divider Decoration */}
              <div className="flex items-center gap-space-sm my-space-xs">
                <div className="flex-1 h-px bg-surface-variant"></div>
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">or verify instantly</span>
                <div className="flex-1 h-px bg-surface-variant"></div>
              </div>

              {/* Biometric Quick-Action Pill */}
              <button
                className="w-full h-12 bg-secondary-container/60 hover:bg-secondary-container text-on-secondary-container font-label-md text-label-md rounded-2xl flex items-center justify-center gap-space-sm transition-all active:scale-[0.98] cursor-pointer"
                onClick={triggerBiometrics}
                type="button"
              >
                <span className="material-symbols-outlined text-primary text-[20px]">fingerprint</span>
                <span className="font-medium">Face ID / Fingerprint login</span>
                <span className="w-2 h-2 rounded-full bg-on-tertiary-container animate-ping ml-1"></span>
              </button>
            </form>

            {/* Sign Up Context Link */}
            <div className="text-center mt-space-lg">
              <p className="font-body-md text-body-md text-secondary">
                Don't have an account?{' '}
                <button
                  className="font-label-md text-label-md text-primary font-bold hover:underline ml-1 cursor-pointer bg-transparent border-none p-0 inline-flex items-center"
                  onClick={() => navigate('/register')}
                >
                  Sign up
                </button>
              </p>
            </div>
          </div>

          {/* Live Traffic Sentinel Mini Card */}
          <div className="mt-space-lg w-full bg-surface-container-high/60 rounded-2xl p-space-md flex items-center justify-between gap-space-sm shadow-sm border border-outline-variant/10">
            <div className="flex items-center gap-space-sm min-w-0">
              <div className="w-10 h-10 rounded-xl bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed shrink-0">
                <span className="material-symbols-outlined text-[22px]">warning</span>
              </div>
              <div className="min-w-0">
                <p className="font-label-md text-label-md text-on-surface truncate">
                  Outer Ring Rd (Silk Board - Marathahalli)
                </p>
                <p className="font-body-sm text-body-sm text-secondary">14 potholes logged past 2h • High delay</p>
              </div>
            </div>
            <span className="font-label-sm text-label-sm px-2 py-1 rounded-full bg-tertiary-fixed-dim/40 text-on-tertiary-fixed-variant font-bold shrink-0">
              LIVE
            </span>
          </div>

          {/* Civic Trust Badge Footer */}
          <div className="flex items-center justify-center gap-2 mt-space-xl px-space-sm text-center">
            <span className="material-symbols-outlined text-secondary text-[18px] shrink-0">verified_user</span>
            <p className="font-label-sm text-label-sm text-secondary leading-snug">
              Official Citizen Crowdsourcing Partner • BBMP & Bengaluru Traffic Police compliant
            </p>
          </div>
        </div>
      </main>

      <Toast message={toastMessage} icon={toastIcon} isOpen={isToastOpen} onClose={() => setIsToastOpen(false)} />
    </div>
  );
}
