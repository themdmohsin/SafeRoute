/**
 * SafeRoute sensor-window contract (schemaVersion 1).
 *
 * This module is the single source of truth for the JSON structure produced by
 * the client sensor pipeline and consumed by the ride telemetry endpoint
 * (POST /api/rides/:id/telemetry) and later by the ML workstream.
 *
 * The full, human-readable contract lives in docs/SENSOR_WINDOW_CONTRACT.md.
 * Any change to these types MUST be mirrored there and bumped in
 * SENSOR_WINDOW_SCHEMA_VERSION.
 *
 * NOTE: This module intentionally contains no ML logic. It only defines the
 * shape and invariants of the data handed to the ML developer.
 */

/** Bump whenever the window structure below changes incompatibly. */
export const SENSOR_WINDOW_SCHEMA_VERSION = 1;

/** Length of one sensor window in milliseconds (walls-clock aligned). */
export const SENSOR_WINDOW_DURATION_MS = 2000;

/** A window batch larger than this is rejected by the backend. */
export const SENSOR_WINDOW_BATCH_LIMIT = 120;

/** Decimal places used for every numeric sensor field. */
export const SENSOR_DECIMALS = 4;

/** One navigation fix accepted by the GPS tracker. */
export interface GpsFix {
  /** degrees, WGS-84, range [-90, 90] */
  lat: number;
  /** degrees, WGS-84, range [-180, 180] */
  lng: number;
  /** metres, 68% confidence radius from the browser, if reported */
  accuracyM: number | null;
  /** metres/second over ground from the device, if reported */
  speedMps: number | null;
  /** degrees clockwise from true north [0, 360), if reported */
  headingDeg: number | null;
  /** epoch ms of the fix (position.timestamp) */
  timestamp: number;
  /** epoch ms when the browser delivered the fix to us */
  receivedAt: number;
}

/** GPS context attached to every sensor window. */
export interface WindowGpsContext {
  /** degrees, WGS-84 */
  lat: number;
  /** degrees, WGS-84 */
  lng: number;
  /** metres; null when the device did not report accuracy */
  accuracyM: number | null;
  /** m/s; null when the device did not report speed */
  speedMps: number | null;
  /** degrees clockwise from true north; null when not reported */
  headingDeg: number | null;
  /** ISO-8601 UTC timestamp of the GPS fix used as context */
  timestamp: string;
}

/** Triple of per-axis numbers, one entry per axis. */
export interface Vector3Stats {
  x: number;
  y: number;
  z: number;
}

/** Per-axis mean/std/min/max for one physical quantity. */
export interface AxisWindowStats {
  mean: Vector3Stats;
  std: Vector3Stats;
  min: Vector3Stats;
  max: Vector3Stats;
}

/** Accelerometer stats in m/s^2 (gravity removed, device frame). */
export interface AccelWindowStats extends AxisWindowStats {
  magnitude: {
    mean: number;
    std: number;
    max: number;
  };
}

/**
 * Estimated gravity vector in the device frame (m/s^2) plus tilt angle.
 * Produced by a low-pass filter over accelerationIncludingGravity; serves as
 * the phone-orientation proxy so the ML side can re-orient samples without
 * raw per-sample data.
 */
export interface GravityEstimate {
  x: number;
  y: number;
  z: number;
  /** angle between gravity vector and device +Z axis, degrees [0, 180] */
  tiltDeg: number;
}

/** Gyroscope stats in degrees/second (device frame). */
export interface GyroWindowStats {
  mean: Vector3Stats;
  std: Vector3Stats;
  maxMagnitudeDegPerS: number;
}

/**
 * One fixed-duration, timestamped sensor window.
 * Aggregates are computed over all DeviceMotion samples that arrived while
 * the window was open; raw per-event sensor data is deliberately NOT sent.
 */
export interface SensorWindow {
  schemaVersion: typeof SENSOR_WINDOW_SCHEMA_VERSION;
  /** Stable identifier: `${rideId}:${seq}` — unique per ride. */
  windowId: string;
  /** Mongo _id of the RideSession this window belongs to. */
  rideId: string;
  /** Monotonic per-ride sequence number starting at 0. */
  seq: number;
  /** ISO-8601 UTC start of the window (wall-clock aligned to windowMs). */
  startedAt: string;
  /** ISO-8601 UTC end of the window (exclusive). */
  endedAt: string;
  /** endedAt - startedAt in ms (equals SENSOR_WINDOW_DURATION_MS except the final window). */
  durationMs: number;
  /** Number of DeviceMotion samples aggregated into this window. */
  sampleCount: number;
  /** Median reported event.interval in ms, or null when unavailable. */
  nominalIntervalMs: number | null;
  /** Latest accepted GPS fix at window close; null when no fix yet. */
  gps: WindowGpsContext | null;
  /** Linear acceleration stats (m/s^2); null when no accelerometer data. */
  accel: AccelWindowStats | null;
  /** Gravity/orientation estimate; null when unavailable. */
  gravity: GravityEstimate | null;
  /** Rotation-rate stats (deg/s); null when no gyroscope data. */
  gyro: GyroWindowStats | null;
}

/** Envelope POSTed to /api/rides/:id/telemetry. */
export interface TelemetryBatch {
  schemaVersion: typeof SENSOR_WINDOW_SCHEMA_VERSION;
  windows: SensorWindow[];
}
