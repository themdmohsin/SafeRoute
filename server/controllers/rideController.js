import mongoose from 'mongoose';
import RideSession from '../models/RideSession.js';

export async function startRide(req, res) {
  const ride = await RideSession.create({ user: req.user.id, startTime: new Date(), route: req.body?.route });
  return res.status(201).json({ ride, id: ride.id });
}

export async function listRides(req, res) {
  const rides = await RideSession.find({ user: req.user.id }).sort({ createdAt: -1 });
  return res.json({ rides });
}

export async function getRide(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid ride id.' });
  const ride = await RideSession.findOne({ _id: req.params.id, user: req.user.id });
  if (!ride) return res.status(404).json({ message: 'Ride not found.' });
  return res.json({ ride });
}

export async function updateRide(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid ride id.' });
  const ride = await RideSession.findOne({ _id: req.params.id, user: req.user.id });
  if (!ride) return res.status(404).json({ message: 'Ride not found.' });
  if (ride.endTime) return res.status(409).json({ message: 'This ride has already ended.' });

  const fields = ['distanceKm', 'durationMinutes', 'hazardsDetectedCount', 'hazardsReportedCount', 'safetyScore', 'route'];
  for (const field of fields) {
    if (field in (req.body || {})) ride[field] = req.body[field];
  }
  ride.endTime = req.body?.endTime ? new Date(req.body.endTime) : new Date();
  if (Number.isNaN(ride.endTime.getTime()) || ride.endTime < ride.startTime) {
    return res.status(400).json({ message: 'endTime must be a valid time after the ride started.' });
  }
  if (!('durationMinutes' in (req.body || {}))) {
    ride.durationMinutes = Math.max(0, Math.round((ride.endTime - ride.startTime) / 60000));
  }
  await ride.save();
  return res.json({ ride });
}
