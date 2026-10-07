import jwt from 'jsonwebtoken';
import User from '../models/User.js';

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
    createdAt: user.createdAt,
  };
}

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
