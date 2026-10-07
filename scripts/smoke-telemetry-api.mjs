/**
 * End-to-end smoke test for the ride telemetry endpoint against a running
 * API. Exercises auth, ride ownership, active-state and validation gates via
 * real HTTP, then deletes every document it created.
 *
 * Usage: API_BASE=http://localhost:5000 node scripts/smoke-telemetry-api.mjs
 */

const API_BASE = process.env.API_BASE || 'http://localhost:5000';
const unique = Date.now();

async function api(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = response.status === 204 ? undefined : await response.json().catch(() => undefined);
  return { status: response.status, data };
}

function check(name, condition, detail = '') {
  if (!condition) {
    console.error(`  FAIL - ${name} ${detail}`);
    process.exitCode = 1;
  } else {
    console.log(`  ok - ${name}`);
  }
}

function validWindow(rideId, seq) {
  const now = Date.now();
  return {
    schemaVersion: 1,
    windowId: `${rideId}:${seq}`,
    rideId,
    seq,
    startedAt: new Date(now - 4000).toISOString(),
    endedAt: new Date(now - 2000).toISOString(),
    durationMs: 2000,
    sampleCount: 100,
    nominalIntervalMs: 16.6667,
    gps: { lat: 12.9716, lng: 77.5946, accuracyM: 8.5, speedMps: 4.21, headingDeg: 271.4, timestamp: new Date(now - 2500).toISOString() },
    accel: {
      mean: { x: 0.1, y: -0.2, z: 0.3 }, std: { x: 0.4, y: 0.5, z: 0.6 },
      min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 },
      magnitude: { mean: 0.5, std: 0.2, max: 1.5 },
    },
    gravity: { x: 0.2, y: -0.4, z: 9.5, tiltDeg: 87.4 },
    gyro: { mean: { x: 1, y: -1, z: 0.5 }, std: { x: 3, y: 2, z: 1 }, maxMagnitudeDegPerS: 21.4403 },
  };
}

const created = { users: [], rides: [], windows: [] };

async function register() {
  const email = `smoke-sensor-${unique}-${created.users.length}@example.com`;
  const { status, data } = await api('/api/auth/register', {
    method: 'POST',
    body: { name: 'Sensor Smoke', email, password: 'smoke-test-password-1' },
  });
  if (status !== 201) throw new Error(`register failed: ${status} ${JSON.stringify(data)}`);
  created.users.push(email);
  return data.token;
}

async function main() {
  console.log(`API: ${API_BASE}`);
  const health = await api('/api/health');
  check('health endpoint reachable', health.status === 200, JSON.stringify(health.data));

  const tokenA = await register();
  const tokenB = await register();
  check('two riders registered', Boolean(tokenA && tokenB));

  const start = await api('/api/rides', { method: 'POST', token: tokenA, body: {} });
  check('ride started', start.status === 201, JSON.stringify(start.data));
  const rideId = start.data.id;
  created.rides.push(rideId);

  const post = await api(`/api/rides/${rideId}/telemetry`, {
    method: 'POST',
    token: tokenA,
    body: { schemaVersion: 1, windows: [validWindow(rideId, 0), validWindow(rideId, 1)] },
  });
  check('valid batch accepted (202)', post.status === 202, JSON.stringify(post.data));
  check('accepted count reported', post.data?.accepted === 2, JSON.stringify(post.data));

  const dup = await api(`/api/rides/${rideId}/telemetry`, {
    method: 'POST',
    token: tokenA,
    body: { schemaVersion: 1, windows: [validWindow(rideId, 1), validWindow(rideId, 2)] },
  });
  check('re-sent window counted as duplicate', dup.status === 202 && dup.data?.duplicates >= 1, JSON.stringify(dup.data));

  const noAuth = await api(`/api/rides/${rideId}/telemetry`, {
    method: 'POST',
    body: { schemaVersion: 1, windows: [validWindow(rideId, 3)] },
  });
  check('unauthenticated request rejected (401)', noAuth.status === 401);

  const foreign = await api(`/api/rides/${rideId}/telemetry`, {
    method: 'POST',
    token: tokenB,
    body: { schemaVersion: 1, windows: [validWindow(rideId, 4)] },
  });
  check("another user's ride rejected (404)", foreign.status === 404);

  const badLat = validWindow(rideId, 5);
  badLat.gps.lat = 123;
  const invalid = await api(`/api/rides/${rideId}/telemetry`, {
    method: 'POST',
    token: tokenA,
    body: { schemaVersion: 1, windows: [badLat] },
  });
  check('invalid latitude rejected (400)', invalid.status === 400 && /gps\.lat/.test(invalid.data?.message || ''), JSON.stringify(invalid.data));

  const huge = await api(`/api/rides/${rideId}/telemetry`, {
    method: 'POST',
    token: tokenA,
    body: { schemaVersion: 1, windows: Array.from({ length: 121 }, (_, i) => validWindow(rideId, 100 + i)) },
  });
  check('oversized batch rejected (400)', huge.status === 400, JSON.stringify(huge.data?.message));

  const end = await api(`/api/rides/${rideId}`, {
    method: 'PATCH',
    token: tokenA,
    body: { distanceKm: 0.089, durationMinutes: 1, endTime: new Date().toISOString() },
  });
  check('ride ended via existing PATCH', end.status === 200);

  const afterEnd = await api(`/api/rides/${rideId}/telemetry`, {
    method: 'POST',
    token: tokenA,
    body: { schemaVersion: 1, windows: [validWindow(rideId, 9)] },
  });
  check('telemetry closed after ride end (409)', afterEnd.status === 409);

  const read = await api(`/api/rides/${rideId}/telemetry?limit=10`, { token: tokenA });
  check('owner can read stored windows', read.status === 200 && read.data?.count === 3, JSON.stringify({ count: read.data?.count }));
  check('windows carry contract fields', ['windowId', 'seq', 'gps', 'accel', 'gyro'].every((key) => key in (read.data?.windows?.[0] ?? {})));

  console.log(process.exitCode ? '\nSMOKE TEST FAILED' : '\nAll telemetry smoke checks passed.');
}

main()
  .catch((error) => {
    console.error('Smoke test crashed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Cleanup: remove everything this test created from the dev database.
    try {
      const { default: mongoose } = await import('mongoose');
      await mongoose.connect(process.env.MONGODB_URI_SERVER || process.env.MONGODB_URI || '');
      const db = mongoose.connection.db;
      if (db) {
        const users = await db.collection('users').find({ email: { $in: created.users } }).toArray();
        const userIds = users.map((user) => user._id);
        await db.collection('ridetelemetrywindows').deleteMany({ user: { $in: userIds } });
        await db.collection('ridesessions').deleteMany({ user: { $in: userIds } });
        await db.collection('users').deleteMany({ _id: { $in: userIds } });
        console.log(`cleanup: removed ${userIds.length} smoke users and their rides/telemetry`);
      }
      await mongoose.disconnect();
    } catch (error) {
      console.warn('cleanup could not run:', error.message);
    }
  });
