import HazardReport from '../models/HazardReport.js';

const allowedTypes = ['pothole', 'waterlogging', 'open_manhole', 'speed_breaker', 'other'];
const allowedSeverities = ['low', 'medium', 'high'];
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildHazardFilter(query) {
  const filter = {};
  if (query.hazardType) {
    if (!allowedTypes.includes(query.hazardType)) return { error: 'Invalid hazardType filter.' };
    filter.hazardType = query.hazardType;
  }
  if (query.severity) {
    if (!allowedSeverities.includes(query.severity)) return { error: 'Invalid severity filter.' };
    filter.severity = query.severity;
  }
  if (query.area) {
    const area = new RegExp(escapeRegex(String(query.area).slice(0, 120)), 'i');
    filter.$or = [{ area }, { roadName: area }];
  }
  if (query.startDate || query.endDate) {
    const createdAt = {};
    if (query.startDate) {
      const start = new Date(query.startDate);
      if (Number.isNaN(start.getTime())) return { error: 'Invalid startDate.' };
      createdAt.$gte = start;
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      if (Number.isNaN(end.getTime())) return { error: 'Invalid endDate.' };
      if (/^\d{4}-\d{2}-\d{2}$/.test(query.endDate)) end.setUTCHours(23, 59, 59, 999);
      createdAt.$lte = end;
    }
    if (createdAt.$gte && createdAt.$lte && createdAt.$gte > createdAt.$lte) {
      return { error: 'startDate must be on or before endDate.' };
    }
    filter.createdAt = createdAt;
  }
  return { filter };
}

export async function getAnalyticsSummary(req, res) {
  const { filter, error } = buildHazardFilter(req.query);
  if (error) return res.status(400).json({ message: error });

  const [totalResult, byDay, zones, severityRows] = await Promise.all([
    HazardReport.aggregate([{ $match: filter }, { $count: 'total' }]),
    HazardReport.aggregate([
      { $match: filter },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    HazardReport.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { area: { $ifNull: ['$area', ''] }, roadName: { $ifNull: ['$roadName', ''] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, '_id.area': 1, '_id.roadName': 1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          area: '$_id.area',
          roadName: '$_id.roadName',
          zone: {
            $cond: [
              { $and: [{ $ne: ['$_id.area', ''] }, { $ne: ['$_id.roadName', ''] }] },
              { $concat: ['$_id.roadName', ', ', '$_id.area'] },
              { $cond: [{ $ne: ['$_id.roadName', ''] }, '$_id.roadName', '$_id.area'] },
            ],
          },
          count: 1,
        },
      },
    ]),
    HazardReport.aggregate([
      { $match: filter },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]),
  ]);

  const severityCounts = Object.fromEntries(severityRows.map(({ _id, count }) => [_id, count]));
  const severityBreakdown = ['low', 'medium', 'high'].map((severity) => ({ severity, count: severityCounts[severity] || 0 }));
  return res.json({
    totalHazards: totalResult[0]?.total || 0,
    hazardsByDay: byDay.map(({ _id, count }) => ({ date: _id, count })),
    topHazardZones: zones,
    severityBreakdown,
    filters: {
      hazardType: req.query.hazardType || null,
      severity: req.query.severity || null,
      area: req.query.area || null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
    },
  });
}
