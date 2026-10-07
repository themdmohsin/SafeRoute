/**
 * Real DeviceMotion handling for an active ride.
 *
 * - Collects acceleration, accelerationIncludingGravity, rotationRate and
 *   event.interval exactly as the browser reports them. No value in this file
 *   is ever fabricated: when the browser reports `null` for a field, that
 *   field is treated as missing.
 * - Derives linear acceleration by subtracting a low-pass gravity estimate
 *   from accelerationIncludingGravity ONLY when event.acceleration is not
 *   provided by the browser (common on Android Chrome). This is documented
 *   preprocessing, not invented data.
 * - Handles browsers that require an explicit motion permission prompt (iOS).
 * - Cleans up its listener on stop() so rides never leak handlers.
 */

export interface MotionSample {
  /** epoch ms when the event reached our handler (used for window bucketing) */
  receivedAt: number;
  /** event.timestamp (DOMHighResTimeStamp, monotonic per page load) */
  monotonicMs: number;
  /** event.interval as reported (ms) or null */
  intervalMs: number | null;
  /** linear acceleration m/s^2 (gravity removed) or null */
  accel: { x: number; y: number; z: number } | null;
  /** low-pass gravity estimate m/s^2, or null when includingGravity missing */
  gravity: { x: number; y: number; z: number } | null;
  /** rotation rate deg/s or null */
  gyro: { alpha: number; beta: number; gamma: number } | null;
}

export type MotionStatus =
  | 'idle'
  | 'unsupported' // no DeviceMotionEvent in this browser
  | 'permission-required' // iOS-style explicit permission gate
  | 'denied'
  | 'active'
  | 'error';

export interface MotionSnapshot {
  status: MotionStatus;
  /** Samples delivered since start(). */
  sampleCount: number;
  /** epoch ms of the newest sample; null before the first one. */
  lastSampleAt: number | null;
  lastError: string | null;
}

/** Exponential smoothing factor for the gravity low-pass filter. */
export const GRAVITY_EMA_ALPHA = 0.1;

type PermissionRequestingDeviceMotion = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export class MotionTracker {
  private handler: ((event: DeviceMotionEvent) => void) | null = null;
  private statusValue: MotionStatus = 'idle';
  private sampleCount = 0;
  private lastSampleAt: number | null = null;
  private lastError: string | null = null;
  private gravityEma: { x: number; y: number; z: number } | null = null;
  private listeners = new Set<(snapshot: MotionSnapshot) => void>();

  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
  }

  static requiresPermission(): boolean {
    if (!MotionTracker.isSupported()) return false;
    const ctor = window.DeviceMotionEvent as PermissionRequestingDeviceMotion;
    return typeof ctor.requestPermission === 'function';
  }

  getStatus(): MotionStatus {
    return this.statusValue;
  }

  snapshot(): MotionSnapshot {
    return {
      status: this.statusValue,
      sampleCount: this.sampleCount,
      lastSampleAt: this.lastSampleAt,
      lastError: this.lastError,
    };
  }

  subscribe(listener: (snapshot: MotionSnapshot) => void): () => void {
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
        // UI listener failures must not break sensor sampling.
      }
    }
  }

  private setStatus(status: MotionStatus) {
    if (this.statusValue !== status) {
      this.statusValue = status;
      this.emit();
    }
  }

  /**
   * iOS 13+ requires a user gesture to grant DeviceMotion access.
   * Call this from a click handler; resolves to true when motion is usable.
   */
  async requestPermission(): Promise<boolean> {
    if (!MotionTracker.isSupported()) {
      this.setStatus('unsupported');
      return false;
    }
    const ctor = window.DeviceMotionEvent as PermissionRequestingDeviceMotion;
    if (typeof ctor.requestPermission !== 'function') {
      return true; // No permission gate; sensors can start immediately.
    }
    try {
      const response = await ctor.requestPermission();
      if (response === 'granted') return true;
      this.lastError = 'Motion sensor permission was denied.';
      this.setStatus('denied');
      return false;
    } catch (error) {
      this.lastError =
        error instanceof Error ? error.message : 'Motion permission request failed.';
      this.setStatus('error');
      return false;
    }
  }

  /** Attach the devicemotion listener; idempotent. */
  start(onSample: (sample: MotionSample) => void) {
    if (this.handler) return;
    if (!MotionTracker.isSupported()) {
      this.lastError = 'This browser does not support DeviceMotion sensors.';
      this.setStatus('unsupported');
      return;
    }

    this.sampleCount = 0;
    this.lastSampleAt = null;
    this.gravityEma = null;
    this.lastError = null;

    this.handler = (event: DeviceMotionEvent) => {
      this.sampleCount += 1;
      this.lastSampleAt = Date.now();

      // Never fabricate values: pass through what the browser reports.
      const includingGravity = event.accelerationIncludingGravity;
      let gravity: { x: number; y: number; z: number } | null = null;
      if (
        includingGravity &&
        finiteOrNull(includingGravity.x) !== null &&
        finiteOrNull(includingGravity.y) !== null &&
        finiteOrNull(includingGravity.z) !== null
      ) {
        const next = {
          x: includingGravity.x as number,
          y: includingGravity.y as number,
          z: includingGravity.z as number,
        };
        // Low-pass estimate of the (roughly constant) gravity vector.
        this.gravityEma = this.gravityEma
          ? {
              x: this.gravityEma.x * (1 - GRAVITY_EMA_ALPHA) + next.x * GRAVITY_EMA_ALPHA,
              y: this.gravityEma.y * (1 - GRAVITY_EMA_ALPHA) + next.y * GRAVITY_EMA_ALPHA,
              z: this.gravityEma.z * (1 - GRAVITY_EMA_ALPHA) + next.z * GRAVITY_EMA_ALPHA,
            }
          : { ...next };
        gravity = { ...this.gravityEma };
      }

      let accel: { x: number; y: number; z: number } | null = null;
      const direct = event.acceleration;
      if (
        direct &&
        finiteOrNull(direct.x) !== null &&
        finiteOrNull(direct.y) !== null &&
        finiteOrNull(direct.z) !== null
      ) {
        accel = { x: direct.x as number, y: direct.y as number, z: direct.z as number };
      } else if (gravity && includingGravity) {
        const igx = finiteOrNull(includingGravity.x);
        const igy = finiteOrNull(includingGravity.y);
        const igz = finiteOrNull(includingGravity.z);
        if (igx !== null && igy !== null && igz !== null) {
          // Documented preprocessing: remove the estimated gravity vector.
          accel = { x: igx - gravity.x, y: igy - gravity.y, z: igz - gravity.z };
        }
      }

      const rotation = event.rotationRate;
      const gyro =
        rotation &&
        finiteOrNull(rotation.alpha) !== null &&
        finiteOrNull(rotation.beta) !== null &&
        finiteOrNull(rotation.gamma) !== null
          ? {
              alpha: rotation.alpha as number,
              beta: rotation.beta as number,
              gamma: rotation.gamma as number,
            }
          : null;

      onSample({
        receivedAt: Date.now(),
        monotonicMs: typeof event.timeStamp === 'number' ? event.timeStamp : 0,
        intervalMs: finiteOrNull(event.interval),
        accel,
        gravity,
        gyro,
      });
    };

    window.addEventListener('devicemotion', this.handler);
    this.setStatus('active');
  }

  /** Remove the listener and reset per-ride counters. Safe to call repeatedly. */
  stop() {
    if (this.handler) {
      window.removeEventListener('devicemotion', this.handler);
      this.handler = null;
    }
    if (this.statusValue !== 'idle') this.setStatus('idle');
  }
}
