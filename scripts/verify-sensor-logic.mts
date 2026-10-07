/**
 * Deterministic verification of the sensor/navigation pure logic.
 * Run: npx tsx scripts/verify-sensor-logic.mts
 * (No browser/device needed — these paths are pure functions.)
 */

import assert from 'node:assert/strict';
import { SensorWindowBuffer } from '../src/sensors/windowing.ts';
import { calculateTrackDistance, haversineMeters } from '../src/sensors/geo.ts';
import { validateTelemetryPayload } from '../server/services/telemetryValidation.js';

let checks = 0;
function ok(name: string, fn: () => void) {
  fn();
  checks += 1;
  console.log(`  ok - ${name}`);
}

// ---------------------------------------------------------------- windowing
ok('windows bucket samples into aligned 2 s windows with stable ids', () => {
  const buffer = new SensorWindowBuffer({
    rideId: 'ride-1',
    now: () => 1_000_000,
    getGpsFix: () => null,
  });
  const base = 1_700_000_000_000; // aligned to 2 s (divisible by 2000)
  for (let i = 0; i < 100; i += 1) {
    buffer.addMotionSample({
      receivedAt: base + i * 20,
      monotonicMs: i * 20,
      intervalMs: 20,
      accel: { x: 0.1, y: -0.2, z: 0.3 },
      gravity: { x: 0, y: 0, z: 9.81 },
      gyro: { alpha: 1, beta: 2, gamma: 3 },
    });
  }
  const windows = buffer.flush();
  assert.equal(windows.length, 1);
  const first = windows[0];
  assert.equal(first.startedAt, new Date(base).toISOString());
  assert.equal(first.sampleCount, 100);
  assert.equal(first.windowId, `ride-1:0`);
  assert.equal(first.seq, 0);
  assert.equal(first.gps, null);
  assert.ok(first.accel);
  assert.equal(first.accel!.mean.y, -0.2);
  assert.equal(first.accel!.magnitude.max, 0.3742); // sqrt(0.1²+0.2²+0.3²)
  assert.equal(first.gyro!.mean.x, 1); // alpha maps to x per the contract
  assert.equal(first.nominalIntervalMs, 20);
});

ok('a second flush continues seq and windowId deterministically', () => {
  const buffer = new SensorWindowBuffer({ rideId: 'ride-1', now: () => 1_000_000 });
  const base = 1_700_000_000_000;
  buffer.addMotionSample({ receivedAt: base, monotonicMs: 0, intervalMs: 16, accel: { x: 1, y: 1, z: 1 }, gravity: null, gyro: null });
  buffer.flush();
  buffer.addMotionSample({ receivedAt: base + 2000, monotonicMs: 2000, intervalMs: 16, accel: { x: 2, y: 2, z: 2 }, gravity: null, gyro: null });
  const second = buffer.flush();
  assert.equal(second.length, 1);
  assert.equal(second[0].seq, 1);
  assert.equal(second[0].windowId, 'ride-1:1');
});

ok('gps context attaches to windows with ISO timestamps', () => {
  const base = 1_700_000_000_000;
  const buffer = new SensorWindowBuffer({
    rideId: 'ride-2',
    now: () => base + 2500,
    getGpsFix: () => ({
      lat: 12.9716,
      lng: 77.5946,
      accuracyM: 8.5,
      speedMps: 4.21,
      headingDeg: 271.4,
      timestamp: base + 1900,
      receivedAt: base + 1900,
    }),
  });
  buffer.addMotionSample({ receivedAt: base, monotonicMs: 0, intervalMs: 16, accel: { x: 0, y: 0, z: 0 }, gravity: null, gyro: null });
  const windows = buffer.flush();
  assert.equal(windows[0].gps!.lat, 12.9716);
  assert.equal(windows[0].gps!.timestamp, new Date(base + 1900).toISOString());
});

// ------------------------------------------------------------- geo/distance
ok('haversine matches a known Bengaluru corridor distance', () => {
  // MG Road metro to Trinity junction is roughly 1.1 km apart.
  const meters = haversineMeters(12.9756, 77.6068, 12.9727, 77.6169);
  assert.ok(meters > 950 && meters < 1250, `got ${meters}`);
});

ok('distance sums real steps and rejects GPS jumps', () => {
  const base = 1_700_000_000_000;
  const fixes = [
    { lat: 12.9716, lng: 77.5946, timestamp: base },          // start
    { lat: 12.9720, lng: 77.5946, timestamp: base + 20_000 }, // ~44 m in 20 s, plausible
    { lat: 13.1000, lng: 77.7000, timestamp: base + 25_000 }, // ~19 km in 5 s -> jump!
    { lat: 12.9724, lng: 77.5946, timestamp: base + 40_000 }, // back on track (~44 m)
  ];
  const result = calculateTrackDistance(fixes);
  // The jump and the recovery segment from the outlier are both implausible
  // and rejected; distance resumes only from the first fix after the outlier.
  assert.equal(result.rejectedJumps, 2);
  assert.equal(result.steps, 1);
  assert.ok(result.meters > 44 && result.meters < 45, `got ${result.meters}`);
});

ok('stationary jitter under the minimum step is not counted', () => {
  const base = 1_700_000_000_000;
  const result = calculateTrackDistance([
    { lat: 12.971600, lng: 77.594600, timestamp: base },
    { lat: 12.971605, lng: 77.594600, timestamp: base + 1000 }, // ~0.55 m
    { lat: 12.971596, lng: 77.594600, timestamp: base + 2000 },
  ]);
  assert.equal(result.meters, 0);
  assert.equal(result.steps, 0);
});

// ------------------------------------------------- backend validation gates
const validWindow = (seq = 0) => ({
  schemaVersion: 1,
  windowId: `68f1a2b3c4d5e6f7a8b9c0d1:${seq}`,
  rideId: '68f1a2b3c4d5e6f7a8b9c0d1',
  seq,
  startedAt: new Date(Date.now() - 4000).toISOString(),
  endedAt: new Date(Date.now() - 2000).toISOString(),
  durationMs: 2000,
  sampleCount: 100,
  nominalIntervalMs: 20,
  gps: { lat: 12.9716, lng: 77.5946, accuracyM: 8.5, speedMps: 4.21, headingDeg: 271.4, timestamp: new Date().toISOString() },
  accel: {
    mean: { x: 0.1, y: -0.2, z: 0.3 }, std: { x: 0.4, y: 0.5, z: 0.6 },
    min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 },
    magnitude: { mean: 0.5, std: 0.2, max: 1.5 },
  },
  gravity: { x: 0.2, y: -0.4, z: 9.5, tiltDeg: 87 },
  gyro: { mean: { x: 1, y: -1, z: 0.5 }, std: { x: 3, y: 2, z: 1 }, maxMagnitudeDegPerS: 21.44 },
});

ok('valid batch passes validation', () => {
  const windows = validateTelemetryPayload({ schemaVersion: 1, windows: [validWindow(0), validWindow(1)] });
  assert.equal(windows.length, 2);
});

ok('bad latitude is rejected', () => {
  const bad = validWindow();
  (bad.gps as { lat: number }).lat = 123;
  assert.throws(() => validateTelemetryPayload({ schemaVersion: 1, windows: [bad] }), /gps\.lat/);
});

ok('NaN/Infinity and wrong schemaVersion are rejected', () => {
  const nan = validWindow();
  (nan.accel!.mean as { x: number }).x = Number.NaN;
  assert.throws(() => validateTelemetryPayload({ windows: [nan] }), /finite/);
  assert.throws(() => validateTelemetryPayload({ schemaVersion: 2, windows: [validWindow()] }), /schemaVersion/);
  assert.throws(() => validateTelemetryPayload({ windows: [] }), /non-empty/);
  assert.throws(
    () => validateTelemetryPayload({ schemaVersion: 1, windows: Array.from({ length: 121 }, (_, i) => validWindow(i)) }),
    /at most 120/,
  );
});

ok('implausible physics and bad timestamps are rejected', () => {
  const g = validWindow();
  (g.gyro!.mean as { x: number }).x = 99_999;
  assert.throws(() => validateTelemetryPayload({ windows: [g] }), /gyro\.mean\.x/);
  const t = validWindow();
  t.startedAt = 'not-a-date';
  assert.throws(() => validateTelemetryPayload({ windows: [t] }), /startedAt/);
});

console.log(`\nAll ${checks} deterministic checks passed.`);
