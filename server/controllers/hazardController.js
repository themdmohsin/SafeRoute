import mongoose from 'mongoose';
import HazardReport from '../models/HazardReport.js';
import { classifySeverity } from '../services/gemini.js';

const allowedTypes = ['pothole', 'waterlogging', 'open_manhole', 'speed_breaker', 'other'];
const allowedSeverities = ['low', 'medium', 'high'];
const allowedStatuses = ['reported', 'verified', 'resolved'];
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function createHazard(req, res) {
  const { hazardType, severity, description, photoUrl, location, roadName, area, source } = req.body || {};
  if (!allowedTypes.includes(hazardType) || !description?.trim()) {
    return res.status(400).json({ message: 'A valid hazardType and description are required.' });
  }
  if (severity && !allowedSeverities.includes(severity)) {
    return res.status(400).json({ message: 'Invalid severity.' });
  }
  if (!location?.coordinates || location.coordinates.length !== 2) {
    return res.status(400).json({ message: 'Location must contain [longitude, latitude] coordinates.' });
  }
  let classification = null;
  if (!severity) classification = await classifySeverity(description.trim());
  try {
    const report = await HazardReport.create({
      reportedBy: req.user.id,
      hazardType,
      severity: severity || classification.severity,
      description: description.trim(),
      photoUrl: photoUrl || null,
      location: { type: 'Point', coordinates: location.coordinates },
      roadName,
      area,
      status: 'reported',
      source: source === 'sensor-detected' ? source : 'manual',
    });
    return res.status(201).json({
      hazard: report,
      classification: classification ? { ...classification, note: classification.aiSuggested ? 'Suggested by Gemini from the report description.' : 'Gemini unavailable; medium severity used as a fallback.' } : null,
    });
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    throw error;
  }
}

export async function listHazards(req, res) {
  const { hazardType, severity, status, area, startDate, endDate } = req.query;
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const filter = {};
  if (hazardType) {
    if (!allowedTypes.includes(hazardType)) return res.status(400).json({ message: 'Invalid hazardType filter.' });
    filter.hazardType = hazardType;
  }
  if (severity) {
    if (!allowedSeverities.includes(severity)) return res.status(400).json({ message: 'Invalid severity filter.' });
    filter.severity = severity;
  }
  if (status) {
    if (!allowedStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status filter.' });
    filter.status = status;
  }
  if (area) {
    const match = new RegExp(escapeRegex(String(area).slice(0, 120)), 'i');
    filter.$or = [{ area: match }, { roadName: match }];
  }
  if (startDate || endDate) {
    const range = {};
    if (startDate) {
      const from = new Date(startDate);
      if (Number.isNaN(from.getTime())) return res.status(400).json({ message: 'Invalid startDate.' });
      range.$gte = from;
    }
    if (endDate) {
      const to = new Date(endDate);
      if (Number.isNaN(to.getTime())) return res.status(400).json({ message: 'Invalid endDate.' });
      if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) to.setUTCHours(23, 59, 59, 999);
      range.$lte = to;
    }
    if (range.$gte && range.$lte && range.$gte > range.$lte) {
      return res.status(400).json({ message: 'startDate must be on or before endDate.' });
    }
    filter.createdAt = range;
  }

  const [hazards, total] = await Promise.all([
    HazardReport.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('reportedBy', 'name'),
    HazardReport.countDocuments(filter),
  ]);
  return res.json({ hazards, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function getHazard(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid hazard id.' });
  const hazard = await HazardReport.findById(req.params.id).populate('reportedBy', 'name');
  if (!hazard) return res.status(404).json({ message: 'Hazard report not found.' });
  return res.json({ hazard });
}

export async function updateHazard(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid hazard id.' });
  const hazard = await HazardReport.findById(req.params.id);
  if (!hazard) return res.status(404).json({ message: 'Hazard report not found.' });
  if (req.user.role !== 'admin' && hazard.reportedBy.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Only the reporter or an admin can update this report.' });
  }

  const editable = ['status', 'severity', 'description', 'photoUrl', 'roadName', 'area', 'hazardType', 'location'];
  for (const key of editable) {
    if (!(key in (req.body || {}))) continue;
    if (key === 'status' && !allowedStatuses.includes(req.body.status)) return res.status(400).json({ message: 'Invalid status.' });
    if (key === 'severity' && !allowedSeverities.includes(req.body.severity)) return res.status(400).json({ message: 'Invalid severity.' });
    if (key === 'hazardType' && !allowedTypes.includes(req.body.hazardType)) return res.status(400).json({ message: 'Invalid hazardType.' });
    if (key === 'location' && (!req.body.location?.coordinates || req.body.location.coordinates.length !== 2)) {
      return res.status(400).json({ message: 'Location must contain [longitude, latitude] coordinates.' });
    }
    hazard[key] = req.body[key];
  }
  await hazard.save();
  return res.json({ hazard });
}

export async function deleteHazard(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid hazard id.' });
  const hazard = await HazardReport.findById(req.params.id);
  if (!hazard) return res.status(404).json({ message: 'Hazard report not found.' });
  if (req.user.role !== 'admin' && hazard.reportedBy.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Only the reporter or an admin can delete this report.' });
  }
  await hazard.deleteOne();
  return res.status(204).end();
}
