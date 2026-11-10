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
  Bellandur: [77.6762, 12.9257],
  'MG Road': [77.6069, 12.9755],
  Hebbal: [77.597, 13.0358],
  Yelahanka: [77.5963, 13.1007],
  'BTM Layout': [77.6101, 12.9166],
};

// Offset spreads reports along a road instead of stacking them on one area pin.
const coordsFor = (spec) => {
  const [lng, lat] = locations[spec.area];
  const [dx, dy] = spec.offset || [0, 0];
  return [Number((lng + dx).toFixed(6)), Number((lat + dy).toFixed(6))];
};

// ML reports carry the model fields the admin console and map show.
const ml = (mlLabel, mlConfidence) => ({ source: 'ml', mlLabel, mlConfidence, modelVersion: 'rf-v1' });

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
  { key: 'bellandur-water-2', area: 'Bellandur', offset: [0.0021, -0.0012], roadName: 'Sarjapur Road near Wipro junction', hazardType: 'waterlogging', severity: 'high', status: 'reported', source: 'manual', daysAgo: 0, description: 'Knee-deep water across both lanes after a heavy evening shower. Two-wheelers are stalling midway and cars are crawling single file. Storm drain inlets are choked with plastic waste.' },
  { key: 'mgroad-pothole-1', area: 'MG Road', offset: [0.0034, 0.0006], roadName: 'MG Road near Trinity Circle', hazardType: 'pothole', severity: 'medium', status: 'verified', source: 'manual', daysAgo: 0, description: 'Pothole about 40 cm wide in the middle lane just past the metro pillar. Cars swerve suddenly to avoid it, and that is risky for bikes filtering through.' },
  { key: 'hebbal-pothole-1', area: 'Hebbal', offset: [-0.0018, 0.0025], roadName: 'Hebbal flyover airport-bound ramp', hazardType: 'pothole', severity: 'high', status: 'reported', ...ml('pothole', 0.91), daysAgo: 1, description: 'Sharp vertical jolt picked up by multiple rides on the ramp. Severe pothole on the expansion joint, hard to see at highway speed.' },
  { key: 'btm-manhole-1', area: 'BTM Layout', offset: [0.0011, 0.0009], roadName: '16th Main, BTM 2nd Stage', hazardType: 'open_manhole', severity: 'high', status: 'reported', source: 'manual', daysAgo: 1, description: 'Manhole cover fully removed during cable work and left open overnight. The only warning is a single plastic barricade with no lights.' },
  { key: 'koramangala-speedbreaker-2', area: 'Koramangala', offset: [-0.0022, 0.0031], roadName: '5th Block, 1st Cross', hazardType: 'speed_breaker', severity: 'medium', status: 'reported', ...ml('speed_breaker', 0.84), daysAgo: 1, description: 'Tall unmarked speed breaker detected by ride sensors. It sits in the shade of a tree, so it is almost invisible at night.' },
  { key: 'whitefield-manhole-2', area: 'Whitefield', offset: [0.0041, -0.0027], roadName: 'ITPL Main Road near Graphite India signal', hazardType: 'open_manhole', severity: 'medium', status: 'verified', source: 'manual', daysAgo: 2, description: 'Drain cover cracked in half. One piece has sunk and left a 15 cm gap along the left edge of the lane.' },
  { key: 'orr-pothole-2', area: 'Outer Ring Road', offset: [-0.0063, 0.0045], roadName: 'ORR near Kadubeesanahalli flyover', hazardType: 'pothole', severity: 'high', status: 'verified', ...ml('pothole', 0.88), daysAgo: 2, description: 'A series of deep potholes over a 50 m stretch, confirmed by 6 separate rides. Heavy truck traffic keeps widening them.' },
  { key: 'yelahanka-water-1', area: 'Yelahanka', offset: [0.0015, -0.0033], roadName: 'Yelahanka New Town underpass', hazardType: 'waterlogging', severity: 'high', status: 'reported', source: 'manual', daysAgo: 3, description: 'Underpass flooded up to the bumper line. Police have closed one side, and traffic is backing up onto Doddaballapur Road.' },
  { key: 'jayanagar-other-1', area: 'Jayanagar', offset: [0.0027, -0.0014], roadName: '30th Cross, 4th T Block', hazardType: 'other', severity: 'medium', status: 'reported', source: 'manual', daysAgo: 3, description: 'A fallen tree branch is blocking half the road after strong winds, and loose wires hang low over it. BBMP has been informed.' },
  { key: 'electroniccity-water-2', area: 'Electronic City', offset: [0.0052, 0.0019], roadName: 'Neeladri Road near Infosys gate', hazardType: 'waterlogging', severity: 'medium', status: 'verified', source: 'sensor-detected', daysAgo: 4, description: 'Recurring water pooling at the dip near the campus gate. It hides a broken road edge underneath.' },
  { key: 'indiranagar-speedbreaker-2', area: 'Indiranagar', offset: [-0.0031, -0.0021], roadName: 'Double Road near ESI Hospital', hazardType: 'speed_breaker', severity: 'low', status: 'verified', ...ml('speed_breaker', 0.77), daysAgo: 4, description: 'Rumble strip followed by a speed breaker. The markings are visible, but riders keep braking hard here.' },
  { key: 'hsr-pothole-2', area: 'HSR Layout', offset: [0.0024, 0.0037], roadName: '19th Main, Sector 1 near BDA Complex', hazardType: 'pothole', severity: 'medium', status: 'reported', source: 'manual', daysAgo: 5, description: 'Road cut for a water pipeline was never fully restored. The sunken trench runs across the lane and catches scooter wheels.' },
  { key: 'marathahalli-water-2', area: 'Marathahalli', offset: [-0.0016, 0.0028], roadName: 'Marathahalli-Sarjapur ORR service road', hazardType: 'waterlogging', severity: 'high', status: 'reported', ...ml('pothole', 0.69), daysAgo: 5, description: 'Waterlogging over a pothole cluster. Ride sensors flagged repeated hard impacts under the water, so the depth cannot be judged.' },
  { key: 'domlur-pothole-2', area: 'Domlur', offset: [0.0019, -0.0024], roadName: 'Old Airport Road near Domlur flyover', hazardType: 'pothole', severity: 'medium', status: 'resolved', source: 'manual', daysAgo: 6, description: 'Pothole near the bus bay has been patched with cold mix. The surface is now uneven but safe at normal speed.' },
  { key: 'silkboard-water-2', area: 'Silk Board', offset: [-0.0027, 0.0013], roadName: 'Hosur Road towards Bommanahalli', hazardType: 'waterlogging', severity: 'high', status: 'verified', source: 'manual', daysAgo: 7, description: 'Heavy waterlogging under the metro construction zone. Barricades narrow the road to one lane, and water hides the trench edges.' },
  { key: 'mgroad-manhole-1', area: 'MG Road', offset: [-0.0041, -0.0008], roadName: 'Brigade Road junction', hazardType: 'open_manhole', severity: 'medium', status: 'resolved', source: 'manual', daysAgo: 8, description: 'Raised manhole frame near the pedestrian crossing has been levelled and resurfaced by BBMP.' },
  { key: 'hebbal-speedbreaker-1', area: 'Hebbal', offset: [0.0036, -0.0019], roadName: 'Bellary Road service lane near Esteem Mall', hazardType: 'speed_breaker', severity: 'medium', status: 'reported', ...ml('speed_breaker', 0.81), daysAgo: 9, description: 'Back-to-back speed breakers with no paint, found from several ride traces. Riders coming off the flyover hit them hard.' },
  { key: 'bellandur-pothole-1', area: 'Bellandur', offset: [-0.0033, 0.0018], roadName: 'Bellandur lake bund road', hazardType: 'pothole', severity: 'high', status: 'reported', source: 'manual', daysAgo: 10, description: 'Broken stretch with potholes and loose gravel along the lake road. There are no streetlights, so it is very risky after dark.' },
  { key: 'btm-pothole-1', area: 'BTM Layout', offset: [-0.0021, -0.0016], roadName: 'BTM Lake road near Udupi Garden signal', hazardType: 'pothole', severity: 'low', status: 'verified', ...ml('pothole', 0.72), daysAgo: 11, description: 'Shallow potholes at the signal stop line. They are minor, but riders brake on gravel there.' },
  { key: 'koramangala-manhole-2', area: 'Koramangala', offset: [0.0029, -0.0026], roadName: 'Inner Ring Road near Forum Mall', hazardType: 'open_manhole', severity: 'high', status: 'resolved', source: 'manual', daysAgo: 13, description: 'Open storm drain chamber has been closed with a new concrete slab after the report.' },
  { key: 'whitefield-speedbreaker-2', area: 'Whitefield', offset: [-0.0048, 0.0014], roadName: 'Brookefield main road', hazardType: 'speed_breaker', severity: 'low', status: 'resolved', source: 'manual', daysAgo: 15, description: 'Speed breaker repainted with thermoplastic stripes and given a warning sign.' },
  { key: 'yelahanka-pothole-1', area: 'Yelahanka', offset: [-0.0024, 0.0021], roadName: 'Yelahanka Old Town market road', hazardType: 'pothole', severity: 'medium', status: 'reported', ...ml('pothole', 0.86), daysAgo: 16, description: 'Market-side potholes with frequent vehicle impacts in ride data. Parked carts push traffic straight over them.' },
  { key: 'indiranagar-manhole-2', area: 'Indiranagar', offset: [0.0016, 0.0032], roadName: '80 Feet Road, HAL 2nd Stage', hazardType: 'open_manhole', severity: 'medium', status: 'verified', source: 'manual', daysAgo: 18, description: 'Manhole sits 8 cm below the road surface in the bike lane. The front wheel drops sharply into it.' },
  { key: 'orr-water-2', area: 'Outer Ring Road', offset: [0.0058, -0.0031], roadName: 'ORR at Devarabeesanahalli', hazardType: 'waterlogging', severity: 'medium', status: 'resolved', source: 'sensor-detected', daysAgo: 20, description: 'Drain desilting has cleared the recurring water pool. The road has been dry after the last two rains.' },
  { key: 'electroniccity-other-1', area: 'Electronic City', offset: [-0.0039, -0.0022], roadName: 'Electronic City elevated tollway exit', hazardType: 'other', severity: 'high', status: 'reported', source: 'manual', daysAgo: 22, description: 'Oil spill across the exit ramp after a tanker leak. The surface is slippery and two minor skids were seen.' },
  { key: 'hsr-manhole-2', area: 'HSR Layout', offset: [-0.0029, -0.0018], roadName: '14th Main, Sector 7', hazardType: 'open_manhole', severity: 'high', status: 'reported', source: 'manual', daysAgo: 27, description: 'Sewer manhole lid lifts and overflows during rain, leaving the opening partly exposed. Local residents have put a stone on it as a marker.' },
  { key: 'jayanagar-speedbreaker-2', area: 'Jayanagar', offset: [-0.0019, 0.0027], roadName: 'South End Circle approach', hazardType: 'speed_breaker', severity: 'low', status: 'verified', ...ml('speed_breaker', 0.79), daysAgo: 33, description: 'Speed breaker sits right after a bend, so it is visible late. Ride data shows most riders braking on it.' },
  { key: 'domlur-water-2', area: 'Domlur', offset: [-0.0023, 0.0017], roadName: 'Amarjyoti Layout main road', hazardType: 'waterlogging', severity: 'low', status: 'resolved', source: 'manual', daysAgo: 40, description: 'Minor puddling has been fixed by re-sloping the road edge.' },
  { key: 'mgroad-water-1', area: 'MG Road', offset: [0.0012, -0.0029], roadName: 'Richmond Road near Richmond Circle', hazardType: 'waterlogging', severity: 'medium', status: 'verified', source: 'sensor-detected', daysAgo: 47, description: 'Water collects in the left lane after rain because of a blocked culvert, leaving a 20 m stretch underwater.' },
  { key: 'hebbal-water-1', area: 'Hebbal', offset: [-0.0044, -0.0012], roadName: 'Hebbal lake service road', hazardType: 'waterlogging', severity: 'high', status: 'resolved', source: 'manual', daysAgo: 55, description: 'Flooding from the lake overflow has been cleared, and new drains were added along the service road.' },
  { key: 'marathahalli-speedbreaker-1', area: 'Marathahalli', offset: [0.0031, -0.0035], roadName: 'Kundalahalli gate road', hazardType: 'speed_breaker', severity: 'medium', status: 'reported', ...ml('speed_breaker', 0.83), daysAgo: 66, description: 'New speed breaker built without signage. Ride sensors spotted a sudden spike in vertical acceleration events here.' },
  { key: 'btm-water-1', area: 'BTM Layout', offset: [0.0026, -0.0031], roadName: 'Madiwala underpass', hazardType: 'waterlogging', severity: 'high', status: 'verified', source: 'manual', daysAgo: 85, description: 'Underpass floods every monsoon, and buses have stalled inside it. Avoid it during heavy rain and take the Hosur Road surface route instead.' },
];

function stableObjectId(value) {
  return createHash('sha256').update(`${batchId}:${value}`).digest('hex').slice(0, 24);
}

function sameReport(existing, spec, userId) {
  const [longitude, latitude] = coordsFor(spec);
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
      location: { type: 'Point', coordinates: coordsFor(spec) },
      roadName: spec.roadName,
      area: spec.area,
      status: spec.status,
      source: spec.source,
      mlLabel: spec.mlLabel ?? null,
      mlConfidence: spec.mlConfidence ?? null,
      modelVersion: spec.modelVersion ?? null,
      timestamp: spec.source === 'ml' ? createdAt : null,
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
