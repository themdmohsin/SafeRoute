import mongoose from 'mongoose';
import User from '../models/User.js';
import HazardReport from '../models/HazardReport.js';
import ContactMessage from '../models/ContactMessage.js';

export async function listUsers(_req, res) {
  const [users, reportCounts] = await Promise.all([
    User.find().sort({ createdAt: -1 }).limit(200),
    HazardReport.aggregate([{ $match: { reportedBy: { $ne: null } } }, { $group: { _id: '$reportedBy', count: { $sum: 1 } } }]),
  ]);
  const countByUser = new Map(reportCounts.map(({ _id, count }) => [_id.toString(), count]));
  return res.json({
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      vehicleType: user.vehicleType || '',
      createdAt: user.createdAt,
      reportCount: countByUser.get(user.id) || 0,
    })),
  });
}

export async function updateUserRole(req, res) {
  const { role } = req.body || {};
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid user id.' });
  if (!['commuter', 'admin'].includes(role)) return res.status(400).json({ message: 'Role must be commuter or admin.' });
  // Stops the last admin from locking everyone out by demoting themselves.
  if (req.params.id === req.user.id) return res.status(400).json({ message: 'You cannot change your own role.' });
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ message: 'User not found.' });
  return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}

export async function listMessages(_req, res) {
  const messages = await ContactMessage.find().sort({ createdAt: -1 }).limit(50);
  return res.json({ messages });
}
