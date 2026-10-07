/**
 * Deterministic sensor-window pipeline.
 *
 * Raw DeviceMotion samples are grouped into fixed-length, wall-clock-aligned
 * windows (default 2000 ms). At close time each window is reduced to the
 * aggregate stats defined by the contract in ./contract.ts and paired with the
 * most recent accepted GPS fix. Raw per-event sensor data never leaves the
 * client — only one compact JSON object per window.
 *
 * Determinism rules:
 *  - A window covers [floor(t / windowMs) * windowMs, +windowMs) using the
 *    sample's receivedAt wall-clock time, so identical sample streams always
 *    produce identical window boundaries.
 *  - windowId is `${rideId}:${seq}` with seq starting at 0 and increasing by
 *    one for every closed window, so ids are unique and ordered per ride.
 *  - Stats are plain means / std-devs over the samples in the window; every
 *    numeric field is rounded to SENSOR_DECIMALS places.
 *
 * Full contract documentation: docs/SENSOR_WINDOW_CONTRACT.md
 */

import {
  SENSOR_DECIMALS,
  SENSOR_WINDOW_DURATION_MS,
  SENSOR_WINDOW_SCHEMA_VERSION,
  type AccelWindowStats,
  type GpsFix,
  type GravityEstimate,
  type GyroWindowStats,
  type SensorWindow,
  type TelemetryBatch,
  type WindowGpsContext,
} from './contract';
import type { MotionSample } from './motion';

export interface SensorWindowBufferOptions {
  rideId: string;
  windowMs?: number;
  /** Wall clock; injectable for deterministic tests. */
  now?: () => number;
  /** Latest accepted GPS fix provider, called once when a window closes. */
  getGpsFix?: () => GpsFix | null;
  /** Upper bound on samples buffered inside one window. */
  maxSamplesPerWindow?: number;
}

/** Guards against degenerate maths for single-sample or zero-variance windows. */
function std(values: number[], mean: number): number {
  if (values.length <= 1) return 0;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) * (value - mean), 0) / (values.length - 1);
  return Math.sqrt(Math.max(0, variance));
}

function round(value: number): number {
  const factor = 10 ** SENSOR_DECIMALS;
  return Math.round(value * factor) / factor;
}

function roundVector(vector: { x: number; y: number; z: number }) {
  return { x: round(vector.x), y: round(vector.y), z: round(vector.z) };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function tiltDegrees(gravity: { x: number; y: number; z: number }): number {
  const magnitude = Math.sqrt(gravity.x ** 2 + gravity.y ** 2 + gravity.z ** 2);
  if (magnitude === 0) return 0;
  // Angle between the gravity vector and the device +Z axis.
  const cosine = Math.min(1, Math.max(-1, Math.abs(gravity.z) / magnitude));
  return (Math.acos(cosine) * 180) / Math.PI;
}

interface WindowBucket {
  startedAtMs: number;
  samples: MotionSample[];
}

function toWindowGpsContext(fix: GpsFix): WindowGpsContext {
  return {
    lat: fix.lat,
    lng: fix.lng,
    accuracyM: fix.accuracyM,
    speedMps: fix.speedMps,
    headingDeg: fix.headingDeg,
    timestamp: new Date(fix.timestamp).toISOString(),
  };
}

export class SensorWindowBuffer {
  private readonly rideId: string;
  private readonly windowMs: number;
  private readonly now: () => number;
  private readonly getGpsFix: () => GpsFix | null;
  private readonly maxSamplesPerWindow: number;
  private open: WindowBucket | null = null;
  private closed: SensorWindow[] = [];
  private nextSeq = 0;

  constructor(options: SensorWindowBufferOptions) {
    this.rideId = options.rideId;
    this.windowMs = options.windowMs ?? SENSOR_WINDOW_DURATION_MS;
    this.now = options.now ?? (() => Date.now());
    this.getGpsFix = options.getGpsFix ?? (() => null);
    this.maxSamplesPerWindow = options.maxSamplesPerWindow ?? 2000;
  }

  /** Number of fully closed windows waiting to be taken. */
  get pendingCount(): number {
    return this.closed.length;
  }

  /**
   * Feed one raw DeviceMotion sample. Closes any windows that have fully
   * elapsed before this sample's bucket, deterministically.
   */
  addMotionSample(sample: MotionSample) {
    if (!Number.isFinite(sample.receivedAt)) return;
    const bucketStart = Math.floor(sample.receivedAt / this.windowMs) * this.windowMs;

    if (!this.open) {
      this.open = { startedAtMs: bucketStart, samples: [sample] };
    } else if (bucketStart === this.open.startedAtMs) {
      if (this.open.samples.length < this.maxSamplesPerWindow) {
        this.open.samples.push(sample);
      }
    } else {
      // Newer bucket: close every elapsed window (a gap in samples simply
      // produces no window for the silent period).
      this.closeWindowAt(this.now());
      this.open = { startedAtMs: bucketStart, samples: [sample] };
    }
  }

  /**
   * Close the currently open window immediately (partial duration) so it can
   * be flushed — used by the periodic sync and by ride end.
   */
  closeOpenWindow(): SensorWindow | null {
    return this.closeWindowAt(this.now());
  }

  private closeWindowAt(nowMs: number): SensorWindow | null {
    const bucket = this.open;
    if (!bucket) return null;
    this.open = null;

    const endedAtMs = Math.min(
      bucket.startedAtMs + this.windowMs,
      Math.max(bucket.startedAtMs + 1, nowMs),
    );
    const window = this.buildWindow(bucket, endedAtMs);
    if (window) this.closed.push(window);
    return window;
  }

  private buildWindow(bucket: WindowBucket, endedAtMs: number): SensorWindow | null {
    const samples = bucket.samples;
    const gpsFix = this.getGpsFix();

    let accel: AccelWindowStats | null = null;
    let gravity: GravityEstimate | null = null;
    let gyro: GyroWindowStats | null = null;
    let nominalIntervalMs: number | null = null;

    const accelSamples = samples.filter((sample) => sample.accel !== null);
    if (accelSamples.length > 0) {
      const xs = accelSamples.map((sample) => sample.accel!.x);
      const ys = accelSamples.map((sample) => sample.accel!.y);
      const zs = accelSamples.map((sample) => sample.accel!.z);
      const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
      const mx = mean(xs);
      const my = mean(ys);
      const mz = mean(zs);
      const mags = accelSamples.map((sample) => {
        const a = sample.accel!;
        return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
      });
      accel = {
        mean: roundVector({ x: mx, y: my, z: mz }),
        std: roundVector({ x: std(xs, mx), y: std(ys, my), z: std(zs, mz) }),
        min: roundVector({
          x: Math.min(...xs),
          y: Math.min(...ys),
          z: Math.min(...zs),
        }),
        max: roundVector({
          x: Math.max(...xs),
          y: Math.max(...ys),
          z: Math.max(...zs),
        }),
        magnitude: {
          mean: round(mean(mags)),
          std: round(std(mags, mean(mags))),
          max: round(Math.max(...mags)),
        },
      };
    }

    const gravitySamples = samples.filter((sample) => sample.gravity !== null);
    if (gravitySamples.length > 0) {
      // The EMA already smooths over time; the newest estimate is the best
      // orientation snapshot for the window.
      const latest = gravitySamples[gravitySamples.length - 1].gravity!;
      gravity = {
        ...roundVector(latest),
        tiltDeg: round(tiltDegrees(latest)),
      };
    }

    const gyroSamples = samples.filter((sample) => sample.gyro !== null);
    if (gyroSamples.length > 0) {
      const alphas = gyroSamples.map((sample) => sample.gyro!.alpha);
      const betas = gyroSamples.map((sample) => sample.gyro!.beta);
      const gammas = gyroSamples.map((sample) => sample.gyro!.gamma);
      const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
      const mags = gyroSamples.map((sample) => {
        const g = sample.gyro!;
        return Math.sqrt(g.alpha * g.alpha + g.beta * g.beta + g.gamma * g.gamma);
      });
      gyro = {
        mean: roundVector({ x: mean(alphas), y: mean(betas), z: mean(gammas) }),
        std: roundVector({
          x: std(alphas, mean(alphas)),
          y: std(betas, mean(betas)),
          z: std(gammas, mean(gammas)),
        }),
        maxMagnitudeDegPerS: round(Math.max(...mags)),
      };
    }

    const intervals = samples
      .map((sample) => sample.intervalMs)
      .filter((value): value is number => value !== null && value > 0);
    if (intervals.length > 0) {
      nominalIntervalMs = round(median(intervals));
    }

    const seq = this.nextSeq;
    this.nextSeq += 1;

    return {
      schemaVersion: SENSOR_WINDOW_SCHEMA_VERSION,
      windowId: `${this.rideId}:${seq}`,
      rideId: this.rideId,
      seq,
      startedAt: new Date(bucket.startedAtMs).toISOString(),
      endedAt: new Date(endedAtMs).toISOString(),
      durationMs: endedAtMs - bucket.startedAtMs,
      sampleCount: samples.length,
      nominalIntervalMs,
      gps: gpsFix ? toWindowGpsContext(gpsFix) : null,
      accel,
      gravity,
      gyro,
    };
  }

  /** Drain every closed window. */
  take(): SensorWindow[] {
    const drained = this.closed;
    this.closed = [];
    return drained;
  }

  /** Close + drain in one step (periodic flush / ride end). */
  flush(): SensorWindow[] {
    this.closeOpenWindow();
    return this.take();
  }

  /** Snapshot of everything not yet taken, without draining. */
  peek(): SensorWindow[] {
    return [...this.closed];
  }

  /** Current envelope ready for the telemetry endpoint. */
  buildBatch(windows: SensorWindow[]): TelemetryBatch {
    return { schemaVersion: SENSOR_WINDOW_SCHEMA_VERSION, windows };
  }
}
