import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import HazardReport from '../models/HazardReport.js';
import RideSession from '../models/RideSession.js';

function createToken(user) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured.');
  return jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
    subject: user.id,
    expiresIn: '7d',
  });
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    vehicleType: user.vehicleType || '',
    vehicleNumber: user.vehicleNumber || '',
    homeArea: user.homeArea || '',
    preferences: {
      audibleAlerts: user.preferences?.audibleAlerts ?? true,
      autoDetect: user.preferences?.autoDetect ?? true,
      anonymousTelemetry: user.preferences?.anonymousTelemetry ?? true,
      nightMap: user.preferences?.nightMap ?? false,
    },
    createdAt: user.createdAt,
  };
}

const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const PREFERENCE_KEYS = ['audibleAlerts', 'autoDetect', 'anonymousTelemetry', 'nightMap'];

export async function register(req, res) {
  const { name, email, password, vehicleType } = req.body || {};
  if (!name?.trim() || !email?.trim() || typeof password !== 'string') {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  try {
    const user = await User.create({ name: name.trim(), email: email.trim(), password, vehicleType });
    return res.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    return res.status(500).json({ message: 'Unable to register right now.' });
  }
}

export async function login(req, res) {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Email or password is incorrect.' });
  }
  return res.json({ token: createToken(user), user: publicUser(user) });
}

export async function me(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User account was not found.' });
  return res.json({ user: publicUser(user) });
}

export async function updateMe(req, res) {
  const body = req.body || {};
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User account was not found.' });

  for (const key of ['name', 'vehicleType', 'vehicleNumber', 'homeArea']) {
    if (!(key in body)) continue;
    if (typeof body[key] !== 'string') return res.status(400).json({ message: `${key} must be text.` });
    if (key === 'name' && !body.name.trim()) return res.status(400).json({ message: 'Name cannot be empty.' });
    user[key] = body[key].trim();
  }
  if (body.preferences !== undefined) {
    if (typeof body.preferences !== 'object' || body.preferences === null) return res.status(400).json({ message: 'preferences must be an object.' });
    for (const key of PREFERENCE_KEYS) {
      if (!(key in body.preferences)) continue;
      if (typeof body.preferences[key] !== 'boolean') return res.status(400).json({ message: `${key} must be true or false.` });
      user.preferences[key] = body.preferences[key];
    }
  }
  try {
    await user.save();
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    throw error;
  }
  return res.json({ user: publicUser(user) });
}

export async function myStats(req, res) {
  const [reports, rides] = await Promise.all([
    HazardReport.find({ reportedBy: req.user.id }).select('hazardType status createdAt').lean(),
    RideSession.find({ user: req.user.id, endTime: { $ne: null } }).select('distanceKm').lean(),
  ]);
  const confirmed = reports.filter((r) => r.status !== 'reported').length;
  const resolved = reports.filter((r) => r.status === 'resolved').length;
  const potholes = reports.filter((r) => r.hazardType === 'pothole').length;
  const istHour = (date) => (new Date(date).getUTCHours() + 5.5) % 24;
  const night = reports.some((r) => istHour(r.createdAt) >= 20 || istHour(r.createdAt) < 5);
  const km = rides.reduce((sum, ride) => sum + (ride.distanceKm || 0), 0);
  return res.json({
    reports: reports.length,
    confirmed,
    resolved,
    rides: rides.length,
    km: Math.round(km * 10) / 10,
    points: reports.length * 10 + confirmed * 15 + resolved * 25 + rides.length * 5,
    badges: [
      { id: 'pothole-hunter', name: 'Pothole Hunter', hint: 'Report 3 potholes', earned: potholes >= 3 },
      { id: 'night-sentinel', name: 'Night Sentinel', hint: 'Report a hazard after 8 pm', earned: night },
      { id: 'rain-rider', name: 'Rain Rider', hint: 'Report waterlogging', earned: reports.some((r) => r.hazardType === 'waterlogging') },
      { id: 'verified-citizen', name: 'Verified Citizen', hint: 'Get a report verified', earned: confirmed > 0 },
    ],
  });
}

export async function forgotPassword(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email) return res.status(400).json({ message: 'Email is required.' });
  const user = await User.findOne({ email });
  if (user) {
    const token = randomBytes(32).toString('hex');
    user.resetTokenHash = hashToken(token);
    user.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    const appUrl = (process.env.CLIENT_ORIGIN || 'http://localhost:3000').split(',')[0].trim();
    // shortcut: no email service, so the link is printed to the server console; add SMTP before real users.
    if (process.env.NODE_ENV !== 'production') console.log(`Password reset link for ${email}: ${appUrl}/reset-password?token=${token}`);
  }
  // Same reply either way so nobody can probe which emails have accounts.
  return res.json({ message: 'If that email has an account, a reset link has been created. It is valid for 30 minutes.' });
}

export async function resetPassword(req, res) {
  const { token, password } = req.body || {};
  if (typeof token !== 'string' || typeof password !== 'string') return res.status(400).json({ message: 'Token and new password are required.' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  const user = await User.findOne({ resetTokenHash: hashToken(token), resetTokenExpires: { $gt: new Date() } }).select('+resetTokenHash +resetTokenExpires');
  if (!user) return res.status(400).json({ message: 'This reset link is invalid or has expired. Ask for a new one.' });
  user.password = password;
  user.resetTokenHash = null;
  user.resetTokenExpires = null;
  await user.save();
  return res.json({ token: createToken(user), user: publicUser(user) });
}
