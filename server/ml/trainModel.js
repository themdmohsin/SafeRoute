import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RandomForestClassifier } from 'ml-random-forest';
import { FEATURE_NAMES, LABEL_CLASSES, buildFeatureVector } from './featureVector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const datasetPath = process.env.SAFE_ROUTE_DATASET_PATH || process.env.ML_DATASET_PATH || process.env.ML_DATASET_CSV || process.env.ML_DATASET_JSON;
const artifactPath = path.join(__dirname, 'modelArtifact.json');

function mapDatasetLabel(label) {
  const normalized = String(label ?? '').trim().toLowerCase();
  const map = {
    normal: 'normal',
    smooth: 'normal',
    asphalt: 'normal',
    speed_breaker: 'speed_breaker',
    'speed breaker': 'speed_breaker',
    speedbump: 'speed_breaker',
    bump: 'speed_breaker',
    hump: 'speed_breaker',
    pothole: 'pothole',
    'road_hole': 'pothole',
    broken_patch: 'pothole',
  };

  if (!map[normalized]) return null;
  return map[normalized];
}

function parseSampleRow(row) {
  const label = mapDatasetLabel(row.label ?? row.className ?? row.target ?? row.event_type ?? row.category);
  if (!label) return null;

  const window = {
    gps: { speedMps: Number(row.speedMps ?? row.speed_mps ?? row.gps_speed_mps ?? row.speed ?? row.speed_mps_value ?? NaN) },
    accel: {
      mean: { x: Number(row.accel_mean_x ?? row.ax_mean ?? NaN), y: Number(row.accel_mean_y ?? row.ay_mean ?? NaN), z: Number(row.accel_mean_z ?? row.az_mean ?? NaN) },
      std: { x: Number(row.accel_std_x ?? row.ax_std ?? NaN), y: Number(row.accel_std_y ?? row.ay_std ?? NaN), z: Number(row.accel_std_z ?? row.az_std ?? NaN) },
      min: { x: Number(row.accel_min_x ?? row.ax_min ?? NaN), y: Number(row.accel_min_y ?? row.ay_min ?? NaN), z: Number(row.accel_min_z ?? row.az_min ?? NaN) },
      max: { x: Number(row.accel_max_x ?? row.ax_max ?? NaN), y: Number(row.accel_max_y ?? row.ay_max ?? NaN), z: Number(row.accel_max_z ?? row.az_max ?? NaN) },
      magnitude: { mean: Number(row.accel_magnitude_mean ?? NaN), std: Number(row.accel_magnitude_std ?? NaN), max: Number(row.accel_magnitude_max ?? NaN) },
    },
    gravity: {
      x: Number(row.gravity_x ?? NaN),
      y: Number(row.gravity_y ?? NaN),
      z: Number(row.gravity_z ?? NaN),
      tiltDeg: Number(row.gravity_tiltDeg ?? NaN),
    },
    gyro: {
      mean: { x: Number(row.gyro_mean_x ?? row.gx_mean ?? NaN), y: Number(row.gyro_mean_y ?? row.gy_mean ?? NaN), z: Number(row.gyro_mean_z ?? row.gz_mean ?? NaN) },
      std: { x: Number(row.gyro_std_x ?? row.gx_std ?? NaN), y: Number(row.gyro_std_y ?? row.gy_std ?? NaN), z: Number(row.gyro_std_z ?? row.gz_std ?? NaN) },
      maxMagnitudeDegPerS: Number(row.gyro_maxMagnitudeDegPerS ?? row.gyro_max_mag ?? NaN),
    },
  };

  return { label, featureVector: buildFeatureVector(window) };
}

async function loadDatasetRows() {
  if (!datasetPath) {
    throw new Error('Real training is blocked: set SAFE_ROUTE_DATASET_PATH to an actual labelled road-sensor dataset before running training.');
  }

  const resolvedPath = path.resolve(datasetPath);
  const raw = await fs.readFile(resolvedPath, 'utf8');

  if (resolvedPath.endsWith('.json')) {
    const parsed = JSON.parse(raw);
    const rows = Array.isArray(parsed) ? parsed : parsed.rows ?? parsed.data ?? [];
    return rows;
  }

  if (resolvedPath.endsWith('.csv')) {
    const lines = raw.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) throw new Error(`CSV dataset at ${resolvedPath} is empty.`);
    const headers = lines[0].split(',').map((item) => item.trim());
    return lines.slice(1).map((line) => {
      const values = line.split(',');
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ?? '';
      });
      return row;
    });
  }

  throw new Error(`Unsupported dataset format for ${resolvedPath}. Use .csv or .json.`);
}

async function trainFromRealDataset() {
  const rows = await loadDatasetRows();
  const parsedRows = rows.map(parseSampleRow).filter(Boolean);

  if (parsedRows.length === 0) {
    throw new Error('The dataset contains no mappable labels for normal, speed_breaker, or pothole.');
  }

  const grouped = new Map();
  for (const item of parsedRows) {
    grouped.set(item.label, (grouped.get(item.label) ?? 0) + 1);
  }

  const featureMatrix = parsedRows.map((item) => item.featureVector);
  const labels = parsedRows.map((item) => LABEL_CLASSES.indexOf(item.label));

  const model = new RandomForestClassifier({
    nEstimators: 100,
    maxFeatures: 0.8,
    replacement: true,
    seed: 42,
  });

  model.train(featureMatrix, labels);

  const artifact = {
    modelVersion: 'real-data-training-pending',
    classes: LABEL_CLASSES,
    features: FEATURE_NAMES,
    datasetSource: datasetPath,
    status: 'trained',
    model: model.toJSON(),
    training: {
      source: 'real-labelled-dataset',
      classCounts: Object.fromEntries([...grouped.entries()].sort()),
      generatedAt: new Date().toISOString(),
    },
  };

  await fs.writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  console.log(`Trained model artifact written to ${artifactPath}`);
  console.log('Class counts:', Object.fromEntries([...grouped.entries()].sort()));
}

try {
  await trainFromRealDataset();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
