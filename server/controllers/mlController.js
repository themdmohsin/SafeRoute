import HazardReport from '../models/HazardReport.js';
import { getHazardThreshold, inferWindow, shouldDebounceMlDetection } from '../services/mlHazardService.js';

const hazardTypeMap = {
  pothole: 'pothole',
  speed_breaker: 'speed_breaker',
};

function normalizeCoordinates(window = {}) {
  const gps = window.gps ?? {};
  const lng = Number(gps.lng ?? window.lng ?? 0);
  const lat = Number(gps.lat ?? window.lat ?? 0);
  return [lng, lat];
}

export async function inferMlWindow(req, res) {
  try {
    const prediction = await inferWindow(req.body?.window ?? req.body);
    return res.json({ prediction, threshold: getHazardThreshold() });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'ML inference failed.' });
  }
}

export async function createMlHazard(req, res) {
  try {
    const window = req.body?.window ?? req.body ?? {};
    const prediction = await inferWindow(window);
    const threshold = getHazardThreshold();

    if (prediction.label === 'normal' || prediction.confidence < threshold) {
      return res.json({ prediction, createdHazard: false, reason: prediction.label === 'normal' ? 'normal' : 'below_confidence_threshold' });
    }

    const [lng, lat] = normalizeCoordinates(window);
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || lng === 0 || lat === 0) {
      return res.status(400).json({ message: 'A valid GPS coordinate is required to create an ML hazard.' });
    }

    const recentHazard = await HazardReport.findOne({
      source: 'ml',
      mlLabel: prediction.label,
      createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) },
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: 50,
        },
      },
    }).sort({ createdAt: -1 });

    if (recentHazard) {
      return res.json({ prediction, createdHazard: false, reason: 'duplicate_recent_hazard', existingHazard: recentHazard._id.toString() });
    }

    const hazardType = hazardTypeMap[prediction.label] ?? 'pothole';
    const report = await HazardReport.create({
      reportedBy: req.user?.id ?? null,
      hazardType,
      severity: hazardType === 'speed_breaker' ? 'medium' : 'high',
      description: `ML-detected ${prediction.label} at confidence ${prediction.confidence.toFixed(3)} from telemetry window ${window.windowId || 'unknown'}.`,
      location: { type: 'Point', coordinates: [lng, lat] },
      roadName: '',
      area: '',
      status: 'reported',
      source: 'ml',
      mlLabel: prediction.label,
      mlConfidence: prediction.confidence,
      modelVersion: prediction.modelVersion,
      rideId: window.rideId || null,
      windowId: window.windowId || null,
      timestamp: window.endedAt ? new Date(window.endedAt) : new Date(),
    });

    return res.status(201).json({ prediction, createdHazard: true, hazard: report });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'ML hazard creation failed.' });
  }
}

export async function checkDuplicateMlHazard(candidate) {
  const list = await HazardReport.find({ source: 'ml', mlLabel: candidate.label, createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) } })
    .sort({ createdAt: -1 })
    .limit(20);

  return list.find((hazard) => shouldDebounceMlDetection(candidate, hazard));
}
