// Parity: raw windows saved by ml/convert.py -> TS computeWindowFeatures must equal ml/features.py output,
// and the exported JS model must reproduce the Python vote fractions (ml/train.py). Run: npm test
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeWindowFeatures, FEATURE_NAMES as TS_FEATURES } from '../../src/lib/sensorWindow.ts';
import { FEATURE_NAMES } from '../ml/featureVector.js';
import { inferWindow } from '../services/mlHazardService.js';

const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/featureParity.json', import.meta.url), 'utf8'));
const toSamples = (rows) => rows.map(([ax, ay, az, gx, gy, gz, rx, ry, rz]) => ({ ax, ay, az, gx, gy, gz, rx, ry, rz }));

test('feature names match across Python, TS and server', () => {
  assert.deepEqual(TS_FEATURES, fixture.features);
  assert.deepEqual(FEATURE_NAMES, fixture.features);
});

test(`TS features match Python on ${fixture.windows.length} saved windows`, () => {
  for (const w of fixture.windows) {
    const ts = computeWindowFeatures(toSamples(w.samples), w.durationS);
    fixture.features.forEach((name, i) => {
      const py = w.features[i];
      assert.ok(Math.abs(ts[name] - py) <= 1e-6 * Math.max(1, Math.abs(py)), `${name}: ts=${ts[name]} py=${py}`);
    });
  }
});

test('JS model reproduces Python vote fractions end to end', async () => {
  for (const w of fixture.windows) {
    const features = computeWindowFeatures(toSamples(w.samples), w.durationS);
    const { probabilities, modelVersion } = await inferWindow({ features });
    assert.equal(modelVersion, fixture.modelVersion);
    w.expectedProbs.forEach((p, c) => assert.ok(Math.abs(Object.values(probabilities)[c] - p) < 1e-9, `${w.label} class ${c}`));
  }
});
