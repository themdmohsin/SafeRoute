import mongoose from 'mongoose';
import RideSession from '../models/RideSession.js';
import RideTelemetryWindow from '../models/RideTelemetryWindow.js';
import { validateTelemetryPayload } from '../services/telemetryValidation.js';

/**
 * POST /api/rides/:id/telemetry
 * Body: { schemaVersion: 1, windows: SensorWindow[] } — see
 * docs/SENSOR_WINDOW_CONTRACT.md.
 *
 * Security model:
 *  - the ride must exist AND belong to req.user.id (ownership is never taken
 *    from the client),
 *  - the ride must still be active (no endTime),
 *  - windows are validated strictly before persistence,
 *  - duplicate (ride, seq) pairs already stored are counted, not duplicated.
 */
export async function postTelemetry(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid ride id.' });
  }
  const ride = await RideSession.findOne({ _id: req.params.id, user: req.user.id });
  if (!ride) return res.status(404).json({ message: 'Ride not found.' });
  if (ride.endTime) {
    return res.status(409).json({ message: 'This ride has already ended; telemetry is closed.' });
  }

  let normalizedWindows;
  try {
    normalizedWindows = validateTelemetryPayload(req.body, { ride });
  } catch (error) {
    if (error.name === 'TelemetryValidationError') {
      return res.status(400).json({ message: error.message });
    }
    throw error;
  }

  const seenWindowIds = new Set();
  for (const window of normalizedWindows) {
    if (seenWindowIds.has(window.windowId)) {
      return res.status(400).json({ message: `Duplicate windowId in batch: ${window.windowId}` });
    }
    seenWindowIds.add(window.windowId);
  }

  const docs = normalizedWindows.map((window) => ({
    ride: ride._id,
    user: req.user.id,
    ...window,
  }));

  let inserted = 0;
  let duplicates = 0;
  try {
    const result = await RideTelemetryWindow.insertMany(docs, { ordered: false });
    inserted = result.length;
  } catch (error) {
    // ordered:false + unique (ride, seq) index: some may have inserted.
    if (error && error.code === 11000) {
      inserted = error.result?.insertedCount ?? 0;
      duplicates = docs.length - inserted;
    } else if (error && error.writeErrors) {
      inserted = error.insertedDocs?.length ?? 0;
      duplicates = error.writeErrors.length;
    } else {
      throw error;
    }
  }

  return res.status(202).json({
    accepted: inserted,
    duplicates,
    firstSeq: normalizedWindows[0]?.seq ?? null,
    lastSeq: normalizedWindows[normalizedWindows.length - 1]?.seq ?? null,
  });
}

/**
 * GET /api/rides/:id/telemetry?limit=&beforeSeq=
 * Returns the ride's windows (owner only), newest-first by sequence.
 */
export async function getTelemetry(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid ride id.' });
  }
  const ride = await RideSession.findOne({ _id: req.params.id, user: req.user.id });
  if (!ride) return res.status(404).json({ message: 'Ride not found.' });

  const limit = Math.min(500, Math.max(1, Number.parseInt(req.query.limit, 10) || 200));
  const filter = { ride: ride._id };
  const beforeSeq = Number.parseInt(req.query.beforeSeq, 10);
  if (Number.isInteger(beforeSeq)) filter.seq = { $lt: beforeSeq };

  const windows = await RideTelemetryWindow.find(filter).sort({ seq: -1 }).limit(limit).lean();
  return res.json({ windows, count: windows.length });
}
