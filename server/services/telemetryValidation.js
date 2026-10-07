/**
 * Strict validation for the sensor-window contract (schemaVersion 1) defined
 * in docs/SENSOR_WINDOW_CONTRACT.md. Everything that reaches the telemetry
 * controller passes through here first.
 *
 * Limits enforced:
 *  - 1..SENSOR_WINDOW_BATCH_LIMIT windows per request,
 *  - every numeric field finite and inside physically plausible bounds,
 *  - latitude/longitude ranges,
 *  - timestamps parseable, ordered, and inside the ride's lifetime (±5 min).
 */

export const SCHEMA_VERSION = 1;
export const MAX_WINDOWS_PER_BATCH = 120;
export const MAX_WINDOW_DURATION_MS = 10_000;
export const MAX_SAMPLES_PER_WINDOW = 5000;
/** Physically implausible accelerometer values (>50 g) are client bugs. */
export const MAX_ACCEL_MS2 = 500;
/** Rotation rates above ~2000 deg/s are sensor glitches. */
export const MAX_GYRO_DEG_S = 4000;
export const MAX_GRAVITY_MS2 = 100;
export const MAX_ACCURACY_M = 10_000;
export const MAX_SPEED_MPS = 100;

export class TelemetryValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TelemetryValidationError';
    this.status = 400;
  }
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function assertFiniteNumber(value, label, min = -Infinity, max = Infinity) {
  if (!isFiniteNumber(value) || value < min || value > max) {
    throw new TelemetryValidationError(`${label} must be a finite number in [${min}, ${max}].`);
  }
  return value;
}

function assertOptionalNumber(value, label, min, max) {
  if (value === null || value === undefined) return null;
  return assertFiniteNumber(value, label, min, max);
}

function assertVector(value, label, min, max) {
  if (value === null || value === undefined || typeof value !== 'object') {
    throw new TelemetryValidationError(`${label} must be an object with x, y, z numbers.`);
  }
  return {
    x: assertFiniteNumber(value.x, `${label}.x`, min, max),
    y: assertFiniteNumber(value.y, `${label}.y`, min, max),
    z: assertFiniteNumber(value.z, `${label}.z`, min, max),
  };
}

function parseTimestamp(value, label) {
  if (typeof value !== 'string') {
    throw new TelemetryValidationError(`${label} must be an ISO-8601 timestamp string.`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TelemetryValidationError(`${label} is not a valid timestamp.`);
  }
  return date;
}

export function validateWindow(rawWindow, { ride, now = new Date() } = {}) {
  if (rawWindow === null || typeof rawWindow !== 'object' || Array.isArray(rawWindow)) {
    throw new TelemetryValidationError('Each window must be a JSON object.');
  }
  const window = rawWindow;

  if (window.schemaVersion !== SCHEMA_VERSION) {
    throw new TelemetryValidationError(`schemaVersion must be ${SCHEMA_VERSION}.`);
  }
  const windowId =
    typeof window.windowId === 'string' && window.windowId.length > 0 && window.windowId.length <= 128
      ? window.windowId
      : null;
  if (!windowId) {
    throw new TelemetryValidationError('windowId must be a non-empty string of at most 128 characters.');
  }
  const seq = assertFiniteNumber(window.seq, 'seq', 0, 1_000_000_000);
  if (!Number.isInteger(seq)) {
    throw new TelemetryValidationError('seq must be an integer.');
  }

  const startedAt = parseTimestamp(window.startedAt, 'startedAt');
  const endedAt = parseTimestamp(window.endedAt, 'endedAt');
  if (endedAt < startedAt) {
    throw new TelemetryValidationError('endedAt must be on or after startedAt.');
  }
  const durationMs = assertFiniteNumber(window.durationMs, 'durationMs', 0, MAX_WINDOW_DURATION_MS);
  if (!Number.isInteger(durationMs)) {
    throw new TelemetryValidationError('durationMs must be an integer.');
  }
  if (endedAt.getTime() - startedAt.getTime() > MAX_WINDOW_DURATION_MS + 1000) {
    throw new TelemetryValidationError('Window duration exceeds the schema limit.');
  }

  const sampleCount = assertFiniteNumber(
    window.sampleCount,
    'sampleCount',
    0,
    MAX_SAMPLES_PER_WINDOW,
  );
  if (!Number.isInteger(sampleCount)) {
    throw new TelemetryValidationError('sampleCount must be an integer.');
  }
  const nominalIntervalMs = assertOptionalNumber(
    window.nominalIntervalMs,
    'nominalIntervalMs',
    0,
    1000,
  );

  // GPS context: valid coordinates, bounded accuracy/speed/heading.
  let gps = null;
  if (window.gps !== null && window.gps !== undefined) {
    if (typeof window.gps !== 'object') {
      throw new TelemetryValidationError('gps must be an object or null.');
    }
    const lat = assertFiniteNumber(window.gps.lat, 'gps.lat', -90, 90);
    const lng = assertFiniteNumber(window.gps.lng, 'gps.lng', -180, 180);
    const accuracyM = assertOptionalNumber(window.gps.accuracyM, 'gps.accuracyM', 0, MAX_ACCURACY_M);
    const speedMps = assertOptionalNumber(window.gps.speedMps, 'gps.speedMps', 0, MAX_SPEED_MPS);
    const headingDeg = assertOptionalNumber(window.gps.headingDeg, 'gps.headingDeg', 0, 360);
    const gpsTimestamp = parseTimestamp(window.gps.timestamp, 'gps.timestamp');
    gps = {
      lat,
      lng,
      accuracyM,
      speedMps,
      headingDeg,
      timestamp: gpsTimestamp.toISOString(),
    };
  }

  // Accelerometer stats (m/s^2).
  let accel = null;
  if (window.accel !== null && window.accel !== undefined) {
    if (typeof window.accel !== 'object') {
      throw new TelemetryValidationError('accel must be an object or null.');
    }
    const magnitude = window.accel.magnitude ?? {};
    accel = {
      mean: assertVector(window.accel.mean, 'accel.mean', -MAX_ACCEL_MS2, MAX_ACCEL_MS2),
      std: assertVector(window.accel.std, 'accel.std', 0, MAX_ACCEL_MS2),
      min: assertVector(window.accel.min, 'accel.min', -MAX_ACCEL_MS2, MAX_ACCEL_MS2),
      max: assertVector(window.accel.max, 'accel.max', -MAX_ACCEL_MS2, MAX_ACCEL_MS2),
      magnitude: {
        mean: assertFiniteNumber(magnitude.mean, 'accel.magnitude.mean', 0, MAX_ACCEL_MS2),
        std: assertFiniteNumber(magnitude.std, 'accel.magnitude.std', 0, MAX_ACCEL_MS2),
        max: assertFiniteNumber(magnitude.max, 'accel.magnitude.max', 0, MAX_ACCEL_MS2),
      },
    };
  }

  // Gravity / orientation estimate.
  let gravity = null;
  if (window.gravity !== null && window.gravity !== undefined) {
    if (typeof window.gravity !== 'object') {
      throw new TelemetryValidationError('gravity must be an object or null.');
    }
    gravity = {
      ...assertVector(window.gravity, 'gravity', -MAX_GRAVITY_MS2, MAX_GRAVITY_MS2),
      tiltDeg: assertFiniteNumber(window.gravity.tiltDeg, 'gravity.tiltDeg', 0, 180),
    };
  }

  // Rotation-rate stats (deg/s).
  let gyro = null;
  if (window.gyro !== null && window.gyro !== undefined) {
    if (typeof window.gyro !== 'object') {
      throw new TelemetryValidationError('gyro must be an object or null.');
    }
    gyro = {
      mean: assertVector(window.gyro.mean, 'gyro.mean', -MAX_GYRO_DEG_S, MAX_GYRO_DEG_S),
      std: assertVector(window.gyro.std, 'gyro.std', 0, MAX_GYRO_DEG_S),
      maxMagnitudeDegPerS: assertFiniteNumber(
        window.gyro.maxMagnitudeDegPerS,
        'gyro.maxMagnitudeDegPerS',
        0,
        MAX_GYRO_DEG_S,
      ),
    };
  }

  // Window timestamps must sit inside the ride's lifetime (±5 min slack for
  // client clock skew) so telemetry cannot be attached to unrelated rides.
  if (ride) {
    const slackMs = 5 * 60 * 1000;
    const lowerBound = new Date(ride.startTime.getTime() - slackMs);
    const upperBound = new Date(now.getTime() + slackMs);
    if (startedAt < lowerBound || startedAt > upperBound) {
      throw new TelemetryValidationError(
        'Window startedAt falls outside the lifetime of this ride.',
      );
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    windowId,
    seq,
    startedAt,
    endedAt,
    durationMs,
    sampleCount,
    nominalIntervalMs,
    gps,
    accel,
    gravity,
    gyro,
  };
}

/**
 * Validate a whole POST /rides/:id/telemetry body. Returns normalized windows
 * or throws TelemetryValidationError.
 */
export function validateTelemetryPayload(body, rideContext = {}) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new TelemetryValidationError('Request body must be a JSON object.');
  }
  const { windows } = body;
  if (!Array.isArray(windows) || windows.length === 0) {
    throw new TelemetryValidationError('windows must be a non-empty array.');
  }
  if (windows.length > MAX_WINDOWS_PER_BATCH) {
    throw new TelemetryValidationError(
      `A batch may contain at most ${MAX_WINDOWS_PER_BATCH} windows.`,
    );
  }
  if (body.schemaVersion !== undefined && body.schemaVersion !== SCHEMA_VERSION) {
    throw new TelemetryValidationError(`schemaVersion must be ${SCHEMA_VERSION}.`);
  }
  return windows.map((window) => validateWindow(window, rideContext));
}
