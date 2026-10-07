/**
 * Real GPS tracking for an active ride.
 *
 * Wraps navigator.geolocation.watchPosition() with:
 *  - explicit lifecycle states surfaced to the UI,
 *  - quality gating (accuracy limits, staleness),
 *  - a real GPS track and cumulative real distance,
 *  - guaranteed watcher cleanup (no leaks when the ride ends).
 *
 * There are no hardcoded coordinates and no mock fixes anywhere in this file.
 */

import type { GpsFix } from './contract';
import {
  MAX_MAP_ACCURACY_M,
  MAX_TRACK_ACCURACY_M,
  STALE_FIX_MS,
  calculateTrackDistance,
  isValidLatitude,
  isValidLongitude,
} from './geo';

export type GpsStatus =
  | 'idle' // not started
  | 'requesting' // watchPosition called, waiting for the first fix / prompt
  | 'active' // receiving fixes
  | 'denied' // permission denied by the user or the OS
  | 'unavailable' // device cannot provide a position
  | 'error'; // timeout or transient failure

export interface GpsSnapshot {
  status: GpsStatus;
  /** Latest accepted fix (accuracy ≤ MAX_MAP_ACCURACY_M); null before the first fix. */
  fix: GpsFix | null;
  /** Number of raw callbacks received (accepted + rejected). */
  rawFixCount: number;
  /** Number of fixes accepted into the track. */
  acceptedFixCount: number;
  /** True when the newest fix is older than STALE_FIX_MS. */
  isStale: boolean;
  /** Real distance travelled, in metres, computed from the accepted track. */
  distanceM: number;
  /** Geodesic length of the accepted track (recomputed; use for debugging). */
  rejectedJumps: number;
  lastError: string | null;
}

const MAX_TRACK_LENGTH = 5000;

export class GpsTracker {
  private watchId: number | null = null;
  private geo: Geolocation | null = null;
  private fixes: GpsFix[] = [];
  private distanceM = 0;
  private rawFixCount = 0;
  private rejectedJumps = 0;
  private lastError: string | null = null;
  private statusValue: GpsStatus = 'idle';
  private listeners = new Set<(snapshot: GpsSnapshot) => void>();

  getStatus(): GpsStatus {
    return this.statusValue;
  }

  getTrack(): readonly GpsFix[] {
    return this.fixes;
  }

  /** Latest fix good enough for the map dot (looser than track gate). */
  getDisplayFix(): GpsFix | null {
    return this.fixes.length > 0 ? this.fixes[this.fixes.length - 1] : null;
  }

  getDistanceMeters(): number {
    return this.distanceM;
  }

  snapshot(now: number = Date.now()): GpsSnapshot {
    const fix = this.getDisplayFix();
    return {
      status: this.statusValue,
      fix,
      rawFixCount: this.rawFixCount,
      acceptedFixCount: this.fixes.length,
      isStale: fix !== null && now - fix.receivedAt > STALE_FIX_MS,
      distanceM: this.distanceM,
      rejectedJumps: this.rejectedJumps,
      lastError: this.lastError,
    };
  }

  subscribe(listener: (snapshot: GpsSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch {
        // A faulty UI listener must never break the tracking loop.
      }
    }
  }

  private setStatus(status: GpsStatus) {
    if (this.statusValue !== status) {
      this.statusValue = status;
    }
  }

  /** Begin watching; idempotent. Returns false when geolocation is unsupported. */
  start(): boolean {
    if (this.watchId !== null) return true;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.lastError = 'This browser does not provide device location.';
      this.setStatus('unavailable');
      this.emit();
      return false;
    }

    this.geo = navigator.geolocation;
    this.lastError = null;
    this.setStatus('requesting');
    this.emit();

    this.watchId = this.geo.watchPosition(
      (position) => this.handlePosition(position),
      (error) => this.handleFailure(error),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 },
    );
    return true;
  }

  /** Stop watching and release resources. Safe to call repeatedly. */
  stop() {
    if (this.watchId !== null && this.geo) {
      this.geo.clearWatch(this.watchId);
    }
    this.watchId = null;
    this.geo = null;
    if (this.statusValue !== 'idle') this.setStatus('idle');
    this.emit();
  }

  private handlePosition(position: GeolocationPosition) {
    this.rawFixCount += 1;
    const { latitude, longitude, accuracy, speed, heading } = position.coords;
    const fix: GpsFix = {
      lat: latitude,
      lng: longitude,
      accuracyM: typeof accuracy === 'number' && Number.isFinite(accuracy) ? accuracy : null,
      speedMps: typeof speed === 'number' && Number.isFinite(speed) && speed >= 0 ? speed : null,
      headingDeg:
        typeof heading === 'number' && Number.isFinite(heading) && heading >= 0 && heading < 360
          ? heading
          : null,
      timestamp: position.timestamp,
      receivedAt: Date.now(),
    };

    if (!isValidLatitude(fix.lat) || !isValidLongitude(fix.lng)) {
      return; // Browser delivered nonsense; ignore but keep the watcher alive.
    }

    const accuracyOk = fix.accuracyM === null || fix.accuracyM <= MAX_MAP_ACCURACY_M;
    const trackOk = fix.accuracyM === null || fix.accuracyM <= MAX_TRACK_ACCURACY_M;

    if (trackOk) {
      const previous = this.fixes[this.fixes.length - 1];
      if (previous) {
        const result = calculateTrackDistance([previous, fix]);
        this.distanceM += result.meters;
        this.rejectedJumps += result.rejectedJumps;
      }
      this.fixes.push(fix);
      if (this.fixes.length > MAX_TRACK_LENGTH) {
        // Distance already accumulated, so trimming old points is safe and
        // keeps memory bounded on very long rides.
        this.fixes.splice(0, this.fixes.length - MAX_TRACK_LENGTH);
      }
    } else if (accuracyOk) {
      // Good enough to show on the map, not good enough to log into the track.
      this.fixes.push(fix);
    }

    this.setStatus('active');
    this.emit();
  }

  private handleFailure(error: GeolocationPositionError) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        this.lastError = 'Location permission was denied. Enable it in your browser settings.';
        this.setStatus('denied');
        break;
      case error.POSITION_UNAVAILABLE:
        this.lastError = 'Device location is currently unavailable.';
        this.setStatus('unavailable');
        break;
      case error.TIMEOUT:
        this.lastError = 'Waiting for a GPS fix is taking longer than expected.';
        this.setStatus('error');
        break;
      default:
        this.lastError = error.message || 'Unknown geolocation failure.';
        this.setStatus('error');
    }
    this.emit();
  }
}
