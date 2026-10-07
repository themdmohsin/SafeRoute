import 'dotenv/config';
import { createHash, randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import HazardReport from './models/HazardReport.js';
import User from './models/User.js';

const batchId = 'saferoute-bengaluru-demo-v1';
const usersToSeed = [
  {
    email: 'demo.commuter@saferoute.example',
    name: 'SafeRoute Demo Commuter',
    role: 'commuter',
    vehicleType: 'scooter',
    passwordEnv: 'SEED_COMMUTER_PASSWORD',
  },
  {
    email: 'demo.admin@saferoute.example',
    name: 'SafeRoute Demo Admin',
    role: 'admin',
    vehicleType: 'car',
    passwordEnv: 'SEED_ADMIN_PASSWORD',
  },
];

const locations = {
  Indiranagar: [77.6412, 12.9716],
  Koramangala: [77.6245, 12.9352],
  'Silk Board': [77.6233, 12.9177],
  'Outer Ring Road': [77.6784, 12.9304],
  Whitefield: [77.7499, 12.9698],
  'HSR Layout': [77.6389, 12.9116],
  Jayanagar: [77.5938, 12.925],
  Marathahalli: [77.6974, 12.9591],
  Domlur: [77.6387, 12.9609],
  'Electronic City': [77.677, 12.8399],
};

const reportSpecs = [
  { key: 'indiranagar-pothole-1', area: 'Indiranagar', roadName: '100 Feet Road near 12th Main', hazardType: 'pothole', severity: 'high', status: 'reported', source: 'manual', daysAgo: 1, description: 'Deep pothole across the left lane near the 12th Main junction; difficult to see after dusk.' },
  { key: 'koramangala-water-1', area: 'Koramangala', roadName: '80 Feet Road near Sony World Signal', hazardType: 'waterlogging', severity: 'medium', status: 'verified', source: 'sensor-detected', daysAgo: 2, description: 'Water pooling along the curb and partly covering the service lane after overnight rain.' },
  { key: 'silkboard-manhole-1', area: 'Silk Board', roadName: 'Silk Board flyover down-ramp', hazardType: 'open_manhole', severity: 'high', status: 'reported', source: 'manual', daysAgo: 3, description: 'Drain cover is missing near the bus stop; the opening is partly hidden by standing water.' },
  { key: 'orr-speedbreaker-1', area: 'Outer Ring Road', roadName: 'ORR service road near Bellandur gate', hazardType: 'speed_breaker', severity: 'low', status: 'resolved', source: 'manual', daysAgo: 4, description: 'Unpainted speed breaker on the service road; approach markings have faded.' },
  { key: 'whitefield-pothole-1', area: 'Whitefield', roadName: 'Whitefield Main Road near Hope Farm', hazardType: 'pothole', severity: 'medium', status: 'verified', source: 'sensor-detected', daysAgo: 6, description: 'Cluster of shallow potholes causes abrupt braking near the junction.' },
  { key: 'hsr-water-1', area: 'HSR Layout', roadName: '27th Main, Sector 2', hazardType: 'waterlogging', severity: 'high', status: 'reported', source: 'manual', daysAgo: 8, description: 'Rainwater has covered most of the near-side lane and the road edge is not visible.' },
  { key: 'jayanagar-pothole-1', area: 'Jayanagar', roadName: '4th Block 11th Main', hazardType: 'pothole', severity: 'low', status: 'resolved', source: 'manual', daysAgo: 10, description: 'Small surface pothole near the pedestrian crossing; patching is holding.' },
  { key: 'marathahalli-manhole-1', area: 'Marathahalli', roadName: 'Outer Ring Road underpass', hazardType: 'open_manhole', severity: 'medium', status: 'verified', source: 'sensor-detected', daysAgo: 12, description: 'Manhole lid sits below the road surface and creates a sharp drop for two-wheelers.' },
  { key: 'domlur-speedbreaker-1', area: 'Domlur', roadName: 'Intermediate Ring Road near the flyover', hazardType: 'speed_breaker', severity: 'medium', status: 'reported', source: 'manual', daysAgo: 14, description: 'Unmarked hump just before the underpass; reflective paint is worn away.' },
  { key: 'electroniccity-pothole-1', area: 'Electronic City', roadName: 'Hosur Road service lane, Phase 1', hazardType: 'pothole', severity: 'high', status: 'reported', source: 'manual', daysAgo: 17, description: 'Large crater at the edge of the service lane with loose gravel around it.' },
  { key: 'indiranagar-water-1', area: 'Indiranagar', roadName: 'CMH Road near Indiranagar Metro', hazardType: 'waterlogging', severity: 'low', status: 'resolved', source: 'sensor-detected', daysAgo: 21, description: 'Shallow water collecting by a blocked storm drain; passable at low speed.' },
  { key: 'koramangala-pothole-2', area: 'Koramangala', roadName: 'Jyoti Nivas College Road', hazardType: 'pothole', severity: 'high', status: 'verified', source: 'manual', daysAgo: 25, description: 'Broken asphalt patch leaves a deep pothole in the turning lane.' },
  { key: 'silkboard-speedbreaker-1', area: 'Silk Board', roadName: 'BTM service road approach', hazardType: 'speed_breaker', severity: 'medium', status: 'resolved', source: 'manual', daysAgo: 30, description: 'Speed breaker lacked advance markings; fresh white paint was applied.' },
  { key: 'orr-manhole-1', area: 'Outer Ring Road', roadName: 'Bellandur ecospace junction', hazardType: 'open_manhole', severity: 'high', status: 'reported', source: 'sensor-detected', daysAgo: 36, description: 'Storm drain cover is displaced and leaves a hazardous gap near the crossing.' },
  { key: 'whitefield-water-1', area: 'Whitefield', roadName: 'Varthur Road near Kundalahalli', hazardType: 'waterlogging', severity: 'medium', status: 'verified', source: 'manual', daysAgo: 42, description: 'Water pools in the outer lane after rain and slows traffic approaching the signal.' },
  { key: 'hsr-speedbreaker-1', area: 'HSR Layout', roadName: 'Agara junction service road', hazardType: 'speed_breaker', severity: 'low', status: 'resolved', source: 'manual', daysAgo: 50, description: 'Low speed hump has uneven paint but remains visible in daylight.' },
  { key: 'jayanagar-manhole-1', area: 'Jayanagar', roadName: '9th Block near the park entrance', hazardType: 'open_manhole', severity: 'medium', status: 'reported', source: 'manual', daysAgo: 60, description: 'Drain lid rocks under vehicle weight and needs inspection.' },
  { key: 'marathahalli-pothole-1', area: 'Marathahalli', roadName: 'Marathahalli bridge approach', hazardType: 'pothole', severity: 'high', status: 'verified', source: 'sensor-detected', daysAgo: 75, description: 'Repeated impact damage has opened a deep pothole near the bridge approach.' },
];

function stableObjectId(value) {
  return createHash('sha256').update(`${batchId}:${value}`).digest('hex').slice(0, 24);
}

function sameReport(existing, spec, userId) {
  const [longitude, latitude] = locations[spec.area];
  return existing.reportedBy.toString() === userId.toString()
    && existing.hazardType === spec.hazardType
    && existing.severity === spec.severity
    && existing.status === spec.status
    && existing.source === spec.source
    && existing.area === spec.area
    && existing.roadName === spec.roadName
    && existing.description === spec.description
    && existing.location?.type === 'Point'
    && existing.location.coordinates[0] === longitude
    && existing.location.coordinates[1] === latitude;
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI);

  const emails = usersToSeed.map((user) => user.email);
  const existingUsers = await User.find({ email: { $in: emails } });
  const usersByEmail = new Map(existingUsers.map((user) => [user.email, user]));
  for (const spec of usersToSeed) {
    const existing = usersByEmail.get(spec.email);
    if (existing && (existing.name !== spec.name || existing.role !== spec.role)) {
      throw new Error(`Refusing to overwrite existing account ${spec.email}; its name or role does not match the seed fixture.`);
    }
  }

  const reportsWithIds = reportSpecs.map((spec, index) => ({ ...spec, _id: stableObjectId(spec.key), userEmail: usersToSeed[index % usersToSeed.length].email }));
  const existingReports = await HazardReport.find({ _id: { $in: reportsWithIds.map((spec) => spec._id) } });
  const reportsById = new Map(existingReports.map((report) => [report._id.toString(), report]));

  // A prior partial run is okay only when every occupied deterministic id is one
  // of these exact seed fixtures attached to its intended seed user.
  for (const spec of reportsWithIds) {
    const existing = reportsById.get(spec._id);
    if (!existing) continue;
    const intendedUser = usersByEmail.get(spec.userEmail);
    if (!intendedUser || !sameReport(existing, spec, intendedUser._id)) {
      throw new Error(`Refusing to overwrite existing hazard document ${spec._id}; it does not match this seed fixture.`);
    }
  }
  if (existingReports.length && usersToSeed.some((spec) => !usersByEmail.has(spec.email))) {
    throw new Error('Seed hazard documents exist but one or more seed users are missing; refusing to attach demo data to a new account.');
  }

  let insertedUsers = 0;
  const generatedPasswords = [];
  for (const spec of usersToSeed) {
    if (usersByEmail.has(spec.email)) continue;
    const password = process.env[spec.passwordEnv] || randomBytes(18).toString('base64url');
    const user = await User.create({
      name: spec.name,
      email: spec.email,
      role: spec.role,
      vehicleType: spec.vehicleType,
      password,
    });
    usersByEmail.set(spec.email, user);
    insertedUsers += 1;
    if (!process.env[spec.passwordEnv]) generatedPasswords.push({ email: spec.email, password });
  }

  let insertedHazards = 0;
  for (const [index, spec] of reportsWithIds.entries()) {
    if (reportsById.has(spec._id)) continue;
    const createdAt = new Date(Date.now() - spec.daysAgo * 24 * 60 * 60 * 1000);
    const user = usersByEmail.get(spec.userEmail);
    await HazardReport.create({
      _id: spec._id,
      reportedBy: user._id,
      hazardType: spec.hazardType,
      severity: spec.severity,
      description: spec.description,
      location: { type: 'Point', coordinates: locations[spec.area] },
      roadName: spec.roadName,
      area: spec.area,
      status: spec.status,
      source: spec.source,
      createdAt,
      updatedAt: createdAt,
    });
    insertedHazards += 1;
  }

  console.log(JSON.stringify({
    status: 'seed_complete',
    usersInserted: insertedUsers,
    usersPresent: usersToSeed.length,
    hazardReportsInserted: insertedHazards,
    hazardReportsPresent: reportSpecs.length,
    batchId,
    ...(generatedPasswords.length ? { generatedDemoCredentials: generatedPasswords } : {}),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(`SafeRoute seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
