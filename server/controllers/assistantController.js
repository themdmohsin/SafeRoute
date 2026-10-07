import HazardReport from '../models/HazardReport.js';
import { askAnthropic } from '../services/anthropic.js';

const knownAreas = [
  'Indiranagar', 'Koramangala', 'Silk Board', 'Outer Ring Road', 'Whitefield',
  'HSR Layout', 'Jayanagar', 'Marathahalli', 'Electronic City', 'Bellandur', 'Domlur',
];
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function deriveQuery(question) {
  const normalized = question.toLowerCase();
  const filter = {};
  const area = knownAreas.find((name) => normalized.includes(name.toLowerCase()));
  if (area) {
    const match = new RegExp(escapeRegex(area), 'i');
    filter.$or = [{ area: match }, { roadName: match }];
  }
  const severity = ['high', 'medium', 'low'].find((value) => normalized.includes(value));
  if (severity) filter.severity = severity;
  let since = null;
  if (/today|tonight|right now/.test(normalized)) {
    since = new Date();
    since.setHours(0, 0, 0, 0);
  } else if (/this week|past week|last week|weekly/.test(normalized)) {
    since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  } else if (/this month|past month|last month|monthly/.test(normalized)) {
    since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }
  if (since) filter.createdAt = { $gte: since };
  return { filter, area: area || null, severity: severity || null, since };
}

export async function askAssistant(req, res) {
  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
  if (!question || question.length > 1000) {
    return res.status(400).json({ message: 'Provide a question of 1 to 1000 characters.' });
  }
  if (!process.env.ANTHROPIC_API_KEY || !process.env.ANTHROPIC_MODEL) {
    return res.status(503).json({ message: 'AI assistant is not configured. Set ANTHROPIC_API_KEY and ANTHROPIC_MODEL in server/.env.' });
  }

  const { filter, area, severity, since } = deriveQuery(question);
  const [hazards, zones] = await Promise.all([
    HazardReport.find(filter)
      .sort({ createdAt: -1 })
      .limit(30)
      .select('hazardType severity description area roadName status createdAt location')
      .lean(),
    HazardReport.aggregate([
      { $match: filter },
      { $group: { _id: { area: '$area', roadName: '$roadName' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);
  const context = {
    matchingHazardCount: await HazardReport.countDocuments(filter),
    appliedFilters: { area, severity, since: since?.toISOString() || null },
    recentHazards: hazards,
    hazardCountsByZone: zones.map(({ _id, count }) => ({ area: _id.area || '', roadName: _id.roadName || '', count })),
  };

  try {
    const answer = await askAnthropic(
      question,
      context,
      'You are SafeRoute’s road safety assistant. Answer using only the supplied MongoDB data. If it does not contain enough information, say so clearly. Do not invent routes, counts, locations, or real-time conditions. Keep the answer concise and practical.',
    );
    if (!answer) return res.status(502).json({ message: 'The AI assistant returned an empty response.' });
    return res.json({ answer, dataUsed: { matchingHazardCount: context.matchingHazardCount, appliedFilters: context.appliedFilters } });
  } catch (error) {
    console.error('Anthropic assistant request failed.');
    return res.status(502).json({ message: 'The AI assistant is temporarily unavailable.' });
  }
}
