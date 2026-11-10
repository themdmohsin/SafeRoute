import HazardReport from '../models/HazardReport.js';
import { askAnthropic } from '../services/anthropic.js';

const knownAreas = [
  'Indiranagar', 'Koramangala', 'Silk Board', 'Outer Ring Road', 'Whitefield',
  'HSR Layout', 'Jayanagar', 'Marathahalli', 'Electronic City', 'Bellandur', 'Domlur',
  'MG Road', 'Hebbal', 'Yelahanka', 'BTM Layout',
];
const SYSTEM_PROMPT = `You are SafeRoute's road safety assistant for commuters in Bengaluru. Riders ask you about road hazards (potholes, waterlogging, open manholes, speed breakers) so they can plan safer trips.

Each message has the user's question plus hazard data pulled from the SafeRoute database:
- matchingHazardCount: total reports matching the filters
- appliedFilters: the area, severity, and time window the server took from the question (null means not filtered)
- recentHazards: up to 30 of the newest matching reports (type, severity, status, area, road, description, createdAt)
- hazardCountsByZone: the areas and roads with the most matching reports

How to answer:
1. Answer the question directly in the first sentence.
2. Back it up with specifics from the data: road names, hazard types, severities, counts, and how recent they are. Point out high-severity and unresolved ("reported" or "verified") hazards first. Treat "resolved" ones as fixed.
3. Finish with practical advice for riders, such as which stretch to avoid or slow down on, extra care at night or in rain, and tips for two-wheelers.
4. Write plain text, because the chat window does not render Markdown. Use no asterisks, no # headings, and no tables. Start with a short intro, then put each point on its own line beginning with "- ". Aim for 80–250 words. Always finish your last sentence and never stop mid-list.

Rules:
- Use only the supplied data for facts. Never make up hazards, counts, roads, routes, or live traffic and weather.
- If the data is empty or doesn't cover the question, say so plainly. Then suggest a better question (for example, name an area such as Koramangala or HSR Layout, or ask about "this week").
- recentHazards is a sample. For totals, use matchingHazardCount.
- General road-safety advice is fine, but keep it clearly separate from what the data shows.
- For questions that have nothing to do with roads, commuting, or SafeRoute, politely say you only help with road safety.`;
const escapeRegex =(value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
      SYSTEM_PROMPT,
    );
    if (!answer) return res.status(502).json({ message: 'The AI assistant returned an empty response.' });
    return res.json({ answer, dataUsed: { matchingHazardCount: context.matchingHazardCount, appliedFilters: context.appliedFilters } });
  } catch (error) {
    console.error('Anthropic assistant request failed.');
    return res.status(502).json({ message: 'The AI assistant is temporarily unavailable.' });
  }
}
