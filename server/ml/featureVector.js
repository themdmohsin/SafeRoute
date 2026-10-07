export const LABEL_CLASSES = ['normal', 'speed_breaker', 'pothole'];

export const FEATURE_NAMES = [
  'accel_mean_x',
  'accel_mean_y',
  'accel_mean_z',
  'accel_std_x',
  'accel_std_y',
  'accel_std_z',
  'accel_min_x',
  'accel_min_y',
  'accel_min_z',
  'accel_max_x',
  'accel_max_y',
  'accel_max_z',
  'accel_magnitude_mean',
  'accel_magnitude_std',
  'accel_magnitude_max',
  'gravity_x',
  'gravity_y',
  'gravity_z',
  'gravity_tiltDeg',
  'gyro_mean_x',
  'gyro_mean_y',
  'gyro_mean_z',
  'gyro_std_x',
  'gyro_std_y',
  'gyro_std_z',
  'gyro_maxMagnitudeDegPerS',
  'gps_speedMps',
];

export function asNumber(value, fallback = Number.NaN) {
  if (value === null || value === undefined) return fallback;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return numericValue;
}

export function featureObjectFromWindow(window = {}) {
  const gps = window.gps ?? {};
  const accel = window.accel ?? {};
  const gravity = window.gravity ?? {};
  const gyro = window.gyro ?? {};

  return {
    accel_mean_x: asNumber(accel?.mean?.x),
    accel_mean_y: asNumber(accel?.mean?.y),
    accel_mean_z: asNumber(accel?.mean?.z),
    accel_std_x: asNumber(accel?.std?.x),
    accel_std_y: asNumber(accel?.std?.y),
    accel_std_z: asNumber(accel?.std?.z),
    accel_min_x: asNumber(accel?.min?.x),
    accel_min_y: asNumber(accel?.min?.y),
    accel_min_z: asNumber(accel?.min?.z),
    accel_max_x: asNumber(accel?.max?.x),
    accel_max_y: asNumber(accel?.max?.y),
    accel_max_z: asNumber(accel?.max?.z),
    accel_magnitude_mean: asNumber(accel?.magnitude?.mean),
    accel_magnitude_std: asNumber(accel?.magnitude?.std),
    accel_magnitude_max: asNumber(accel?.magnitude?.max),
    gravity_x: asNumber(gravity?.x),
    gravity_y: asNumber(gravity?.y),
    gravity_z: asNumber(gravity?.z),
    gravity_tiltDeg: asNumber(gravity?.tiltDeg),
    gyro_mean_x: asNumber(gyro?.mean?.x),
    gyro_mean_y: asNumber(gyro?.mean?.y),
    gyro_mean_z: asNumber(gyro?.mean?.z),
    gyro_std_x: asNumber(gyro?.std?.x),
    gyro_std_y: asNumber(gyro?.std?.y),
    gyro_std_z: asNumber(gyro?.std?.z),
    gyro_maxMagnitudeDegPerS: asNumber(gyro?.maxMagnitudeDegPerS),
    gps_speedMps: asNumber(gps?.speedMps),
  };
}

export function buildFeatureVector(window = {}) {
  const featureObject = featureObjectFromWindow(window);
  return FEATURE_NAMES.map((featureName) => {
    const value = featureObject[featureName];
    return Number.isFinite(value) ? value : Number.NaN;
  });
}

export function labelFromIndex(index) {
  return LABEL_CLASSES[index] ?? 'normal';
}

export function indexFromLabel(label) {
  return LABEL_CLASSES.indexOf(label);
}
