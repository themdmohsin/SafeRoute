import test from 'node:test';
import assert from 'node:assert/strict';

import { FEATURE_NAMES, LABEL_CLASSES, buildFeatureVector } from '../ml/featureVector.js';
import { getHazardThreshold, inferWindow, shouldDebounceMlDetection } from '../services/mlHazardService.js';

const validWindow = {
  schemaVersion: 1,
  windowId: 'demo-window-1',
  rideId: 'ride-1',
  seq: 42,
  startedAt: '2026-10-08T12:00:00.000Z',
  endedAt: '2026-10-08T12:00:02.000Z',
  durationMs: 2000,
  sampleCount: 118,
  nominalIntervalMs: 16.6667,
  gps: { lat: 12.9716, lng: 77.5946, accuracyM: 8.5, speedMps: 4.21, headingDeg: 271.4, timestamp: '2026-10-08T12:00:01.000Z' },
  accel: {
    mean: { x: 0.0421, y: -0.1180, z: 0.0312 },
    std: { x: 0.5120, y: 0.2871, z: 0.4103 },
    min: { x: -1.9340, y: -1.2210, z: -1.0030 },
    max: { x: 2.2100, y: 1.1103, z: 1.8720 },
    magnitude: { mean: 0.7531, std: 0.4410, max: 3.1204 },
  },
  gravity: { x: 0.211, y: -0.4032, z: 9.5641, tiltDeg: 87.4 },
  gyro: {
    mean: { x: 1.2104, y: -0.331, z: 0.0821 },
    std: { x: 3.441, y: 2.1104, z: 1.0031 },
    maxMagnitudeDegPerS: 21.4403,
  },
};

const potholeWindow = {
  ...validWindow,
  windowId: 'demo-window-pothole',
  gps: { ...validWindow.gps, lat: 12.9720, lng: 77.5951, speedMps: 10.2 },
  accel: {
    mean: { x: 0.9, y: -0.34, z: 0.29 },
    std: { x: 1.58, y: 0.86, z: 0.96 },
    min: { x: -2.54, y: -1.7, z: -1.42 },
    max: { x: 4.02, y: 2.54, z: 2.71 },
    magnitude: { mean: 2.11, std: 1.28, max: 4.72 },
  },
  gravity: { x: 0.7, y: -0.81, z: 8.95, tiltDeg: 83.9 },
  gyro: {
    mean: { x: 5.1, y: -1.52, z: 0.82 },
    std: { x: 8.6, y: 4.9, z: 4.1 },
    maxMagnitudeDegPerS: 34.7,
  },
};

const normalWindow = {
  ...validWindow,
  windowId: 'demo-window-normal',
  gps: { ...validWindow.gps, speedMps: 3.4 },
  accel: {
    mean: { x: 0.04, y: -0.05, z: 0.03 },
    std: { x: 0.18, y: 0.14, z: 0.17 },
    min: { x: -0.62, y: -0.71, z: -0.74 },
    max: { x: 0.95, y: 0.68, z: 0.8 },
    magnitude: { mean: 0.45, std: 0.2, max: 1.3 },
  },
  gravity: { x: 0.21, y: -0.32, z: 9.63, tiltDeg: 87.7 },
  gyro: {
    mean: { x: 0.12, y: -0.06, z: 0.08 },
    std: { x: 0.59, y: 0.52, z: 0.49 },
    maxMagnitudeDegPerS: 2.6,
  },
};

test('feature extraction returns deterministic feature vectors', () => {
  const vector = buildFeatureVector(validWindow);
  assert.equal(vector.length, FEATURE_NAMES.length);
  assert.ok(vector.every((value) => Number.isFinite(value)));
});

test('missing gyro values stay missing and are not replaced with fake zeros', () => {
  const missingGyroWindow = {
    ...validWindow,
    gyro: null,
  };
  const vector = buildFeatureVector(missingGyroWindow);
  const gyroMaxIndex = FEATURE_NAMES.indexOf('gyro_maxMagnitudeDegPerS');
  assert.ok(Number.isNaN(vector[gyroMaxIndex]));
});

test('missing GPS values are handled without fabricated zero values', () => {
  const missingGpsWindow = {
    ...validWindow,
    gps: { lat: null, lng: null },
  };
  const vector = buildFeatureVector(missingGpsWindow);
  const speedIndex = FEATURE_NAMES.indexOf('gps_speedMps');
  assert.ok(Number.isNaN(vector[speedIndex]));
});

test('model loads successfully and returns a valid label and confidence', async () => {
  const result = await inferWindow(validWindow);
  assert.ok(LABEL_CLASSES.includes(result.label));
  assert.ok(result.confidence >= 0 && result.confidence <= 1);
});

test('low confidence and normal predictions are not treated as hazards', async () => {
  const result = await inferWindow(normalWindow);
  assert.equal(result.label, 'normal');
  assert.ok(result.confidence >= 0 && result.confidence <= 1);
  assert.ok(getHazardThreshold() > 0.5);
});

test('pothole-like windows produce a hazard-class prediction', async () => {
  const result = await inferWindow(potholeWindow);
  assert.ok(['pothole', 'speed_breaker'].includes(result.label));
  assert.ok(result.confidence >= 0 && result.confidence <= 1);
});

test('duplicate nearby ML detections are suppressed by debounce logic', () => {
  const previous = {
    mlLabel: 'pothole',
    createdAt: new Date('2026-10-08T12:00:00.000Z'),
    location: { coordinates: [77.5946, 12.9716] },
  };
  const candidate = {
    label: 'pothole',
    timestamp: new Date('2026-10-08T12:00:10.000Z'),
    location: { coordinates: [77.59462, 12.9717] },
  };
  assert.equal(shouldDebounceMlDetection(candidate, previous), true);
});
