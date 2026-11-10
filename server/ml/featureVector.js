export const LABEL_CLASSES = ['normal', 'speed_breaker', 'pothole'];

// Orientation-independent features computed on the phone by computeWindowFeatures (src/lib/sensorWindow.ts)
// and offline by ml/features.py. Order must match the model artifact's `features`.
const SIGNALS = ['accTotal', 'accLinear', 'vertical', 'horizontal', 'gyro', 'jerk'];
const STATS = ['mean', 'std', 'min', 'max', 'ptp', 'rms', 'skew', 'kurt', 'zcr', 'domFreq', 'bandLow', 'bandHigh'];
export const FEATURE_NAMES = SIGNALS.flatMap((s) => STATS.map((t) => `${s}_${t}`));

export function asNumber(value, fallback = Number.NaN) {
  if (value === null || value === undefined) return fallback;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return numericValue;
}

// Missing values stay NaN; the service imputes them with training medians.
export function buildFeatureVector(window = {}) {
  const features = window?.features ?? {};
  return FEATURE_NAMES.map((name) => asNumber(features[name]));
}

export function labelFromIndex(index) {
  return LABEL_CLASSES[index] ?? 'normal';
}

export function indexFromLabel(label) {
  return LABEL_CLASSES.indexOf(label);
}
