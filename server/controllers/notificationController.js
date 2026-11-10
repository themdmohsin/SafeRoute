import HazardReport from '../models/HazardReport.js';
import User from '../models/User.js';

// Notifications are derived from existing data: updates on my reports + new high-severity hazards.
export async function listNotifications(req, res) {
  const user = await User.findById(req.user.id).select('notificationsSeenAt');
  if (!user) return res.status(404).json({ message: 'User account was not found.' });
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [myUpdates, highAlerts] = await Promise.all([
    HazardReport.find({ reportedBy: req.user.id, status: { $in: ['verified', 'resolved'] } })
      .sort({ updatedAt: -1 }).limit(10).select('hazardType status area roadName updatedAt').lean(),
    HazardReport.find({ severity: 'high', status: { $ne: 'resolved' }, createdAt: { $gte: weekAgo }, reportedBy: { $ne: req.user.id } })
      .sort({ createdAt: -1 }).limit(10).select('hazardType area roadName createdAt').lean(),
  ]);

  const place = (h) => [h.roadName, h.area].filter(Boolean).join(', ') || 'an unnamed road';
  const type = (h) => h.hazardType.replaceAll('_', ' ');
  const items = [
    ...myUpdates.map((h) => ({
      id: `status-${h._id}-${h.status}`,
      kind: 'status',
      text: `Your ${type(h)} report on ${place(h)} was ${h.status === 'resolved' ? 'marked fixed' : 'verified'}.`,
      at: h.updatedAt,
    })),
    ...highAlerts.map((h) => ({
      id: `alert-${h._id}`,
      kind: 'alert',
      text: `High-severity ${type(h)} reported on ${place(h)}.`,
      at: h.createdAt,
    })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at));

  const seenAt = user.notificationsSeenAt || new Date(0);
  return res.json({
    items: items.map((item) => ({ ...item, unread: new Date(item.at) > seenAt })),
    unreadCount: items.filter((item) => new Date(item.at) > seenAt).length,
  });
}

export async function markNotificationsRead(req, res) {
  await User.updateOne({ _id: req.user.id }, { notificationsSeenAt: new Date() });
  return res.status(204).end();
}
