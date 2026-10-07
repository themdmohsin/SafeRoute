import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader.tsx';
import BottomNav from '../components/BottomNav.tsx';
import Toast from '../components/Toast.tsx';
import RideMap from '../map/RideMap.tsx';
import { useActiveRide } from '../hooks/useActiveRide.ts';

/** Renders any subsystem status as an honest coloured chip. */
function StatusChip({
  label,
  status,
  detail,
  action,
}: {
  label: string;
  status: string;
  detail?: string | null;
  action?: { text: string; onClick: () => void };
}) {
  const tone =
    status === 'active' || status === 'ready'
      ? 'bg-tertiary-fixed-dim/20 text-on-tertiary-fixed-variant'
      : status === 'requesting' || status === 'permission-required' || status === 'syncing'
        ? 'bg-secondary-container text-on-secondary-container'
        : status === 'denied' || status === 'error' || status === 'unavailable'
          ? 'bg-error-container text-on-error-container'
          : 'bg-surface-container-high text-on-surface-variant';
  const icon =
    status === 'active' || status === 'ready'
      ? 'check_circle'
      : status === 'requesting' || status === 'permission-required'
        ? 'pending'
        : status === 'denied' || status === 'error'
          ? 'error'
          : status === 'unavailable'
            ? 'block'
            : 'radio_button_unchecked';
  return (
    <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${tone}`}>
      <span className="material-symbols-outlined text-[14px]">{icon}</span>
      <span className="font-label-sm text-[11px] font-bold uppercase tracking-wide">
        {label}: {status}
      </span>
      {detail && <span className="font-label-sm text-[11px] opacity-80 truncate max-w-[130px]">{detail}</span>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="ml-1 rounded-full bg-surface-container-lowest px-2 py-0.5 font-label-sm text-[11px] font-bold text-primary active:scale-95 cursor-pointer"
        >
          {action.text}
        </button>
      )}
    </div>
  );
}

function gpsDetail(
  fix: { lat: number; lng: number; accuracyM: number | null } | null,
  isStale: boolean,
): string | null {
  if (!fix) return null;
  const accuracy = fix.accuracyM !== null ? `±${Math.round(fix.accuracyM)}m` : '±?';
  return `${fix.lat.toFixed(5)}, ${fix.lng.toFixed(5)} ${accuracy}${isStale ? ' (stale)' : ''}`;
}

export default function ActiveRideScreen() {
  const navigate = useNavigate();
  const ride = useActiveRide();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isToastOpen, setIsToastOpen] = useState(false);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setIsToastOpen(true);
  };

  // No active ride session: be honest instead of simulating one.
  if (!ride.rideId) {
    return (
      <div className="bg-primary-container text-surface pt-safe pb-safe antialiased min-h-screen flex flex-col">
        <AppHeader title="Active Ride" variant="main" />
        <main className="flex-1 flex flex-col items-center justify-center gap-4 bg-surface max-w-lg w-full mx-auto px-6 text-center">
          <span className="material-symbols-outlined text-4xl text-secondary">directions_car_off</span>
          <h2 className="font-headline-sm text-lg font-bold text-on-surface">No active ride</h2>
          <p className="font-body-sm text-secondary">
            Start a ride first so SafeRoute can track real GPS, motion and telemetry.
          </p>
          <button
            onClick={() => navigate('/ride/start')}
            className="h-12 px-6 rounded-xl bg-primary text-on-primary font-label-lg font-bold active:scale-95 cursor-pointer"
          >
            Go to Start Ride
          </button>
        </main>
        <BottomNav />
      </div>
    );
  }

  const gps = ride.gps;
  const motion = ride.motion;

  return (
    <div className="bg-primary-container text-surface pt-safe pb-safe antialiased min-h-screen flex flex-col">
      <AppHeader title="Active Ride" variant="main" />

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-24 bg-surface max-w-lg mx-auto">
        <div className="flex flex-col w-full relative select-none overflow-hidden pb-6">
          <div className="relative w-full h-[640px] overflow-hidden rounded-3xl bg-primary shadow-2xl">
            {/* Real Mapbox map driven by live GPS */}
            <RideMap
              position={ride.mapPosition}
              track={ride.trackCoordinates}
              route={ride.route.coordinates}
              destination={
                ride.route.status === 'ready' && ride.route.coordinates
                  ? {
                      lat: ride.route.coordinates[ride.route.coordinates.length - 1][1],
                      lng: ride.route.coordinates[ride.route.coordinates.length - 1][0],
                      label: ride.route.label ?? ride.destinationQuery ?? '',
                    }
                  : null
              }
              follow={ride.follow}
            />

            {/* TOP HUD: live route guidance (real route, no fake turns) */}
            <div className="absolute top-3 inset-x-3 z-30 flex flex-col gap-2.5">
              <div className="w-full bg-primary/95 backdrop-blur-xl text-on-primary rounded-2xl p-3.5 shadow-2xl flex items-center gap-3.5 border border-outline-variant/15">
                <div className="w-12 h-12 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center flex-shrink-0 shadow-inner">
                  <span className="material-symbols-outlined text-3xl font-bold">
                    {ride.route.status === 'ready' ? 'route' : ride.route.status === 'error' ? 'alt_route' : 'near_me'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  {ride.route.status === 'ready' ? (
                    <>
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="font-display text-headline-md tracking-tight font-extrabold text-on-primary truncate">
                          {ride.route.distanceKm?.toFixed(1)} km
                        </span>
                        <span className="font-label-md text-tertiary-fixed font-bold bg-tertiary-container px-2 py-0.5 rounded-md flex-shrink-0">
                          {ride.route.durationMin} min
                        </span>
                      </div>
                      <p className="font-body-md text-primary-fixed text-xs sm:text-sm font-medium line-clamp-1">
                        Via Mapbox driving → {ride.route.label ?? ride.destinationQuery}
                      </p>
                    </>
                  ) : ride.route.status === 'resolving' ? (
                    <>
                      <span className="font-display text-headline-md font-extrabold text-on-primary">Calculating route…</span>
                      <p className="font-body-md text-primary-fixed text-xs sm:text-sm font-medium line-clamp-1">
                        Destination: {ride.destinationQuery ?? 'not set'}
                      </p>
                    </>
                  ) : ride.route.status === 'error' ? (
                    <>
                      <span className="font-display text-headline-md font-extrabold text-on-primary">Routing unavailable</span>
                      <p className="font-body-md text-primary-fixed text-xs sm:text-sm font-medium line-clamp-2">
                        {ride.route.errorMessage}
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="font-display text-headline-md font-extrabold text-on-primary">
                        {ride.destinationQuery ? 'Waiting for GPS…' : 'No destination set'}
                      </span>
                      <p className="font-body-md text-primary-fixed text-xs sm:text-sm font-medium line-clamp-1">
                        {ride.destinationQuery
                          ? 'The route is calculated from your real position.'
                          : 'Start a ride from the Start Ride screen to navigate.'}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Live Telemetry Matrix — all values real */}
              <div className="w-full bg-surface-container-lowest/90 backdrop-blur-xl rounded-2xl p-3 shadow-lg flex items-center justify-between border border-outline-variant/15">
                <div className="flex flex-col items-center flex-1 px-1">
                  <span className="font-label-sm text-secondary uppercase font-semibold">Distance</span>
                  <div className="flex items-baseline gap-0.5 mt-0.5">
                    <span className="font-display text-headline-sm font-extrabold text-on-surface">
                      {ride.distanceKm > 0 || gps.status === 'active' ? ride.distanceKm.toFixed(2) : '—'}
                    </span>
                    <span className="font-label-sm text-secondary font-semibold">km</span>
                  </div>
                  <span className="font-label-sm text-[10px] text-secondary">
                    {gps.acceptedFixCount > 0 ? `${gps.acceptedFixCount} fixes` : 'no GPS track'}
                  </span>
                </div>
                <div className="w-px h-7 bg-outline-variant/50"></div>

                <div className="flex flex-col items-center flex-1 px-1">
                  <span className="font-label-sm text-secondary uppercase font-semibold">Time</span>
                  <div className="flex items-baseline gap-0.5 mt-0.5">
                    <span className="font-display text-headline-sm font-extrabold text-on-surface">
                      {formatTime(ride.elapsedSeconds)}
                    </span>
                  </div>
                  <span className="font-label-sm text-[10px] text-secondary">elapsed</span>
                </div>
                <div className="w-px h-7 bg-outline-variant/50"></div>

                <div className="flex flex-col items-center flex-1 px-1">
                  <span className="font-label-sm text-secondary uppercase font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping"></span>
                    Reports
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-display text-headline-sm font-extrabold text-error">
                      {Number(localStorage.getItem('saferoute_active_ride_reports') || 0)}
                    </span>
                  </div>
                  <span className="font-label-sm text-[10px] text-secondary">this ride</span>
                </div>
                <div className="w-px h-7 bg-outline-variant/50"></div>

                <div className="flex flex-col items-center flex-1 px-1">
                  <span className="font-label-sm text-secondary uppercase font-semibold">Speed</span>
                  <div className="flex items-baseline gap-0.5 mt-0.5">
                    <span className="font-display text-headline-sm font-extrabold text-primary-container">
                      {ride.speedKmh !== null ? ride.speedKmh.toFixed(0) : '—'}
                    </span>
                    <span className="font-label-sm text-secondary font-semibold">km/h</span>
                  </div>
                  <span className="font-label-sm text-[10px] text-secondary">
                    {ride.speedKmh !== null ? 'from GPS' : 'not reported'}
                  </span>
                </div>
              </div>
            </div>

            {/* Sensor status strip: honest states for GPS, motion, wake lock, telemetry */}
            <div className="absolute left-3 right-3 bottom-24 z-20 flex flex-col items-start gap-1.5">
              <StatusChip
                label="GPS"
                status={gps.isStale && gps.status === 'active' ? 'stale' : gps.status}
                detail={gpsDetail(gps.fix, gps.isStale)}
              />
              <StatusChip
                label="Motion"
                status={motion.status}
                detail={motion.status === 'active' ? `${motion.sampleCount} samples` : motion.lastError}
                action={
                  motion.status === 'permission-required'
                    ? { text: 'Enable', onClick: () => void ride.requestMotionAccess() }
                    : undefined
                }
              />
              <StatusChip label="Wake lock" status={ride.wakeLock.status} detail={ride.wakeLock.lastError} />
              <StatusChip
                label="Telemetry"
                status={ride.telemetry.status}
                detail={
                  ride.telemetry.status === 'error' && ride.telemetry.lastError
                    ? `${ride.telemetry.pendingCount} queued · ${ride.telemetry.lastError}`
                    : `${ride.telemetry.uploadedCount} uploaded${ride.telemetry.pendingCount > 0 ? ` · ${ride.telemetry.pendingCount} queued` : ''}`
                }
              />
            </div>

            {/* Map controls */}
            <div className="absolute right-3 bottom-52 z-20 flex flex-col gap-2.5">
              <button
                aria-label="Recenter map on my location"
                onClick={ride.recenter}
                className={`w-10 h-10 rounded-xl bg-surface-container-lowest/90 backdrop-blur-md text-on-surface flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer ${
                  ride.follow ? 'ring-2 ring-primary/40' : ''
                }`}
              >
                <span className="material-symbols-outlined text-xl">my_location</span>
              </button>
              <button
                aria-label="Recalculate route"
                onClick={() => {
                  ride.reroute();
                  showToast('Recalculating the route from your current position.');
                }}
                className="w-10 h-10 rounded-xl bg-surface-container-lowest/90 backdrop-blur-md text-on-surface flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">alt_route</span>
              </button>
            </div>

            {/* FLOATING ACTION BUTTON: quick hazard report */}
            <div className="absolute right-4 bottom-44 z-30">
              <button
                id="floating-report-btn"
                aria-label="Instant Hazard Report"
                onClick={() => navigate('/report')}
                className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-on-tertiary-container text-on-primary shadow-2xl active:scale-90 transition-all duration-200 cursor-pointer"
              >
                <span className="absolute -inset-2 rounded-full bg-on-tertiary-container/30 animate-ping pointer-events-none"></span>
                <div className="relative flex flex-col items-center justify-center">
                  <span
                    className="material-symbols-outlined text-2xl font-bold text-surface-container-lowest"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    add_alert
                  </span>
                  <span className="font-label-sm text-[9px] font-extrabold tracking-tight uppercase text-surface-container-lowest leading-none mt-0.5">
                    Report
                  </span>
                </div>
              </button>
            </div>

            {/* BOTTOM CONTROL SHEET */}
            <div className="absolute inset-x-0 bottom-0 z-30 p-3 pt-2 bg-gradient-to-t from-primary via-primary/95 to-transparent">
              <div className="bg-surface-container-lowest/95 backdrop-blur-xl rounded-2xl p-3 shadow-2xl flex flex-col gap-2.5 border border-outline-variant/10">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                  {['Pothole', 'Waterlog', 'Road Work', 'Unmarked Bump'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => showToast(`${tag} reports use the full form for accurate location data.`)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-label-md hover:bg-surface-container active:scale-95 transition-all flex-shrink-0 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm text-primary">report</span>
                      {tag}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    id="end-ride-trigger"
                    onClick={() => setIsModalOpen(true)}
                    disabled={ride.isEnding}
                    className="flex-1 h-12 px-4 rounded-xl bg-error text-on-error flex items-center justify-center gap-2 font-label-lg font-bold shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-80"
                  >
                    <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      stop_circle
                    </span>
                    <span className="tracking-wide">{ride.isEnding ? 'Finishing…' : 'End & Save Ride'}</span>
                  </button>
                </div>
                {ride.endError && (
                  <p className="font-body-sm text-xs text-error" role="alert">
                    {ride.endError}
                  </p>
                )}
              </div>
            </div>

            {/* Confirm End Ride Modal */}
            {isModalOpen && (
              <div
                id="end-confirm-modal"
                className="absolute inset-0 z-50 bg-primary/70 backdrop-blur-sm flex items-end justify-center p-4 animate-in fade-in"
              >
                <div className="w-full bg-surface-container-lowest rounded-3xl p-5 shadow-2xl flex flex-col gap-4 border border-outline-variant/20 animate-in slide-in-from-bottom-5">
                  <div className="flex items-center gap-3 text-on-surface">
                    <div className="w-12 h-12 rounded-2xl bg-error-container text-on-error-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-2xl">flag_circle</span>
                    </div>
                    <div>
                      <h3 className="font-headline-sm font-bold text-on-surface">Finish Ride & Save Stats?</h3>
                      <p className="font-body-sm text-secondary">
                        {ride.distanceKm.toFixed(2)} km tracked over {formatTime(ride.elapsedSeconds)} from your real
                        GPS track
                        {ride.telemetry.pendingCount > 0
                          ? `, ${ride.telemetry.pendingCount} telemetry windows still uploading`
                          : ''}
                        .
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      id="cancel-end-btn"
                      onClick={() => setIsModalOpen(false)}
                      className="h-12 rounded-xl bg-surface-container-high text-on-surface font-label-lg font-semibold active:scale-95 transition-transform cursor-pointer"
                    >
                      Resume
                    </button>
                    <button
                      id="confirm-save-btn"
                      onClick={() => {
                        setIsModalOpen(false);
                        void ride.endRide();
                      }}
                      disabled={ride.isEnding}
                      className="h-12 rounded-xl bg-error text-on-error font-label-lg font-bold shadow-md active:scale-95 transition-transform cursor-pointer flex items-center justify-center gap-1 disabled:opacity-80"
                    >
                      {ride.isEnding && <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>}
                      <span>{ride.isEnding ? 'Saving...' : 'Yes, Save & Exit'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav />
      <Toast message={toastMessage} isOpen={isToastOpen} onClose={() => setIsToastOpen(false)} />
    </div>
  );
}
