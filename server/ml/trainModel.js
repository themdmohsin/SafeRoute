import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RandomForestClassifier } from 'ml-random-forest';
import { FEATURE_NAMES, LABEL_CLASSES } from './featureVector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactPath = path.join(__dirname, 'modelArtifact.json');

const syntheticDataset = [
  {
    label: 'normal',
    values: {
      accel_mean_x: 0.02, accel_mean_y: -0.04, accel_mean_z: 0.03, accel_std_x: 0.25, accel_std_y: 0.18, accel_std_z: 0.22,
      accel_min_x: -0.95, accel_min_y: -0.81, accel_min_z: -0.92, accel_max_x: 1.1, accel_max_y: 0.88, accel_max_z: 0.97,
      accel_magnitude_mean: 0.57, accel_magnitude_std: 0.28, accel_magnitude_max: 1.64,
      gravity_x: 0.18, gravity_y: -0.32, gravity_z: 9.52, gravity_tiltDeg: 87.1,
      gyro_mean_x: 0.18, gyro_mean_y: -0.12, gyro_mean_z: 0.05, gyro_std_x: 0.72, gyro_std_y: 0.58, gyro_std_z: 0.62,
      gyro_maxMagnitudeDegPerS: 3.1, gps_speedMps: 4.2,
    },
  },
  {
    label: 'normal',
    values: {
      accel_mean_x: 0.04, accel_mean_y: -0.07, accel_mean_z: 0.02, accel_std_x: 0.21, accel_std_y: 0.14, accel_std_z: 0.19,
      accel_min_x: -0.74, accel_min_y: -0.69, accel_min_z: -0.81, accel_max_x: 0.92, accel_max_y: 0.64, accel_max_z: 0.71,
      accel_magnitude_mean: 0.48, accel_magnitude_std: 0.22, accel_magnitude_max: 1.28,
      gravity_x: 0.21, gravity_y: -0.29, gravity_z: 9.63, gravity_tiltDeg: 87.7,
      gyro_mean_x: 0.12, gyro_mean_y: -0.06, gyro_mean_z: 0.08, gyro_std_x: 0.59, gyro_std_y: 0.52, gyro_std_z: 0.49,
      gyro_maxMagnitudeDegPerS: 2.6, gps_speedMps: 5.1,
    },
  },
  {
    label: 'normal',
    values: {
      accel_mean_x: -0.02, accel_mean_y: 0.08, accel_mean_z: 0.05, accel_std_x: 0.24, accel_std_y: 0.17, accel_std_z: 0.2,
      accel_min_x: -0.88, accel_min_y: -0.54, accel_min_z: -0.91, accel_max_x: 0.96, accel_max_y: 0.7, accel_max_z: 0.82,
      accel_magnitude_mean: 0.52, accel_magnitude_std: 0.25, accel_magnitude_max: 1.42,
      gravity_x: 0.24, gravity_y: -0.38, gravity_z: 9.59, gravity_tiltDeg: 87.4,
      gyro_mean_x: 0.14, gyro_mean_y: 0.09, gyro_mean_z: -0.03, gyro_std_x: 0.66, gyro_std_y: 0.55, gyro_std_z: 0.58,
      gyro_maxMagnitudeDegPerS: 3.3, gps_speedMps: 3.8,
    },
  },
  {
    label: 'speed_breaker',
    values: {
      accel_mean_x: 0.2, accel_mean_y: -0.09, accel_mean_z: 0.18, accel_std_x: 0.84, accel_std_y: 0.52, accel_std_z: 0.63,
      accel_min_x: -1.5, accel_min_y: -1.02, accel_min_z: -0.96, accel_max_x: 2.1, accel_max_y: 1.4, accel_max_z: 1.7,
      accel_magnitude_mean: 0.98, accel_magnitude_std: 0.66, accel_magnitude_max: 2.38,
      gravity_x: 0.38, gravity_y: -0.56, gravity_z: 9.31, gravity_tiltDeg: 85.8,
      gyro_mean_x: 2.2, gyro_mean_y: -0.7, gyro_mean_z: 0.35, gyro_std_x: 3.9, gyro_std_y: 2.4, gyro_std_z: 2.1,
      gyro_maxMagnitudeDegPerS: 18.2, gps_speedMps: 7.6,
    },
  },
  {
    label: 'speed_breaker',
    values: {
      accel_mean_x: 0.17, accel_mean_y: -0.08, accel_mean_z: 0.14, accel_std_x: 0.79, accel_std_y: 0.49, accel_std_z: 0.66,
      accel_min_x: -1.42, accel_min_y: -0.93, accel_min_z: -1.05, accel_max_x: 2.18, accel_max_y: 1.32, accel_max_z: 1.58,
      accel_magnitude_mean: 0.91, accel_magnitude_std: 0.55, accel_magnitude_max: 2.21,
      gravity_x: 0.31, gravity_y: -0.49, gravity_z: 9.24, gravity_tiltDeg: 86.2,
      gyro_mean_x: 1.9, gyro_mean_y: -0.64, gyro_mean_z: 0.28, gyro_std_x: 3.1, gyro_std_y: 2.2, gyro_std_z: 1.9,
      gyro_maxMagnitudeDegPerS: 17.6, gps_speedMps: 7.2,
    },
  },
  {
    label: 'speed_breaker',
    values: {
      accel_mean_x: 0.23, accel_mean_y: -0.14, accel_mean_z: 0.17, accel_std_x: 0.84, accel_std_y: 0.57, accel_std_z: 0.72,
      accel_min_x: -1.66, accel_min_y: -1.04, accel_min_z: -1.18, accel_max_x: 2.32, accel_max_y: 1.48, accel_max_z: 1.82,
      accel_magnitude_mean: 1.02, accel_magnitude_std: 0.68, accel_magnitude_max: 2.44,
      gravity_x: 0.29, gravity_y: -0.5, gravity_z: 9.18, gravity_tiltDeg: 85.6,
      gyro_mean_x: 2.3, gyro_mean_y: -0.8, gyro_mean_z: 0.42, gyro_std_x: 4.1, gyro_std_y: 2.7, gyro_std_z: 2.3,
      gyro_maxMagnitudeDegPerS: 19.9, gps_speedMps: 8.2,
    },
  },
  {
    label: 'pothole',
    values: {
      accel_mean_x: 0.88, accel_mean_y: -0.31, accel_mean_z: 0.28, accel_std_x: 1.42, accel_std_y: 0.81, accel_std_z: 0.93,
      accel_min_x: -2.3, accel_min_y: -1.5, accel_min_z: -1.28, accel_max_x: 3.7, accel_max_y: 2.2, accel_max_z: 2.35,
      accel_magnitude_mean: 1.82, accel_magnitude_std: 1.12, accel_magnitude_max: 4.08,
      gravity_x: 0.61, gravity_y: -0.75, gravity_z: 9.06, gravity_tiltDeg: 84.3,
      gyro_mean_x: 4.8, gyro_mean_y: -1.3, gyro_mean_z: 0.9, gyro_std_x: 7.8, gyro_std_y: 4.5, gyro_std_z: 3.7,
      gyro_maxMagnitudeDegPerS: 32.4, gps_speedMps: 10.1,
    },
  },
  {
    label: 'pothole',
    values: {
      accel_mean_x: 0.92, accel_mean_y: -0.34, accel_mean_z: 0.34, accel_std_x: 1.58, accel_std_y: 0.86, accel_std_z: 0.96,
      accel_min_x: -2.54, accel_min_y: -1.7, accel_min_z: -1.42, accel_max_x: 4.02, accel_max_y: 2.54, accel_max_z: 2.71,
      accel_magnitude_mean: 2.11, accel_magnitude_std: 1.28, accel_magnitude_max: 4.72,
      gravity_x: 0.7, gravity_y: -0.81, gravity_z: 8.95, gravity_tiltDeg: 83.9,
      gyro_mean_x: 5.1, gyro_mean_y: -1.52, gyro_mean_z: 0.82, gyro_std_x: 8.6, gyro_std_y: 4.9, gyro_std_z: 4.1,
      gyro_maxMagnitudeDegPerS: 34.7, gps_speedMps: 11.5,
    },
  },
  {
    label: 'pothole',
    values: {
      accel_mean_x: 0.85, accel_mean_y: -0.29, accel_mean_z: 0.25, accel_std_x: 1.38, accel_std_y: 0.78, accel_std_z: 0.91,
      accel_min_x: -2.18, accel_min_y: -1.42, accel_min_z: -1.19, accel_max_x: 3.54, accel_max_y: 2.14, accel_max_z: 2.52,
      accel_magnitude_mean: 1.68, accel_magnitude_std: 1.04, accel_magnitude_max: 4.31,
      gravity_x: 0.58, gravity_y: -0.68, gravity_z: 9.12, gravity_tiltDeg: 84.6,
      gyro_mean_x: 4.4, gyro_mean_y: -1.22, gyro_mean_z: 0.94, gyro_std_x: 7.2, gyro_std_y: 4.2, gyro_std_z: 3.4,
      gyro_maxMagnitudeDegPerS: 31.2, gps_speedMps: 9.8,
    },
  },
];

function median(values) {
  const numbers = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (numbers.length === 0) return 0;
  const midpoint = Math.floor(numbers.length / 2);
  if (numbers.length % 2 === 0) {
    return (numbers[midpoint - 1] + numbers[midpoint]) / 2;
  }
  return numbers[midpoint];
}

function buildTrainingMatrix() {
  const rows = syntheticDataset.map(({ values }) => FEATURE_NAMES.map((featureName) => values[featureName] ?? Number.NaN));
  const mediansByFeature = FEATURE_NAMES.map((_, index) => median(rows.map((row) => row[index])));

  const cleanedRows = rows.map((row) => row.map((value, index) => (Number.isFinite(value) ? value : mediansByFeature[index])));
  const labels = syntheticDataset.map(({ label }) => LABEL_CLASSES.indexOf(label));

  return { rows: cleanedRows, labels, mediansByFeature };
}

const { rows, labels, mediansByFeature } = buildTrainingMatrix();
const model = new RandomForestClassifier({
  nEstimators: 50,
  maxFeatures: 0.8,
  replacement: true,
  seed: 42,
});

model.train(rows, labels);

const artifact = {
  modelVersion: '1.0.0-demo',
  classes: LABEL_CLASSES,
  features: FEATURE_NAMES,
  medians: mediansByFeature,
  model: model.toJSON(),
  training: {
    label: 'synthetic-demo',
    notes: 'This is a deliberately small synthetic demo dataset for smoke testing and API validation; it is not a production road-surface model.',
    generatedAt: new Date().toISOString(),
    classes: LABEL_CLASSES,
  },
};

await fs.writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
console.log(`Saved demo ML model artifact to ${artifactPath}`);
