import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import { FEATURE_NAMES, LABEL_CLASSES, buildFeatureVector } from '../ml/featureVector.js';
import { getHazardThreshold, inferWindow, loadModelArtifact, shouldDebounceMlDetection } from '../services/mlHazardService.js';

// Real RoadSens-4M test-split windows, features precomputed by ml/features.py (see featureParity.test.js).
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/featureParity.json', import.meta.url), 'utf8'));
const asWindow = (w) => ({ schemaVersion: 2, gps: { lat: 12.9716, lng: 77.5946 }, features: Object.fromEntries(fixture.features.map((n, i) => [n, w.features[i]])) });
const hazardProb = (w) => 1 - w.expectedProbs[0];

test('feature extraction returns the full ordered feature vector', () => {
  const vector = buildFeatureVector(asWindow(fixture.windows[0]));
  assert.equal(vector.length, FEATURE_NAMES.length);
  assert.ok(vector.every((value) => Number.isFinite(value)));
});

test('missing features stay missing and are not replaced with fake zeros', () => {
  const vector = buildFeatureVector({ gps: { lat: null, lng: null } });
  assert.ok(vector.every((value) => Number.isNaN(value)));
});

test('trained model loads and returns a valid label and confidence', async () => {
  const artifact = await loadModelArtifact();
  assert.equal(artifact.status, 'trained');
  assert.deepEqual(artifact.features, FEATURE_NAMES);
  const result = await inferWindow(asWindow(fixture.windows[0]));
  assert.ok(LABEL_CLASSES.includes(result.label));
  assert.ok(result.confidence >= 0 && result.confidence <= 1);
});

test('hazard threshold comes from the artifact unless overridden by env', async () => {
  const artifact = await loadModelArtifact();
  assert.equal(getHazardThreshold(artifact), artifact.hazardThreshold);
  process.env.ML_HAZARD_CONFIDENCE_THRESHOLD = '0.9';
  assert.equal(getHazardThreshold(artifact), 0.9);
  delete process.env.ML_HAZARD_CONFIDENCE_THRESHOLD;
});

test('windows below the hazard threshold are normal', async () => {
  const { hazardThreshold } = await loadModelArtifact();
  const w = fixture.windows.find((x) => x.label === 'normal' && hazardProb(x) < hazardThreshold);
  assert.equal((await inferWindow(asWindow(w))).label, 'normal');
});

test('confident pothole-like windows produce a hazard-class prediction', async () => {
  const { hazardThreshold } = await loadModelArtifact();
  const w = fixture.windows.find((x) => x.label === 'pothole' && hazardProb(x) >= hazardThreshold);
  const result = await inferWindow(asWindow(w));
  assert.ok(['pothole', 'speed_breaker'].includes(result.label));
  assert.ok(result.confidence >= hazardThreshold);
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
