const { getMongoDb } = require('../mongo/mongo.client');
const COLL = 'reading_sessions';

async function startReadingSession({ userId, bookId, device, pagesRead = [], highlights = [], meta = {} }) {
  const db = await getMongoDb();
  const now = new Date();
  const { insertedId } = await db.collection(COLL).insertOne({
    userId, bookId, device: String(device || 'unknown'),
    startAt: now, endAt: null,
    pagesRead: pagesRead.map(Number),
    highlights: highlights.map(h => ({ page: Number(h.page), text: String(h.text || ''), color: h.color ?? null })),
    meta
  });
  return { _id: insertedId, startAt: now };
}

async function appendReadingActivity(sessionId, { pagesRead = [], highlights = [] }) {
  const db = await getMongoDb();
  const ops = {};
  if (pagesRead.length) ops.pagesRead = { $each: pagesRead.map(Number) };
  if (highlights.length) ops.highlights = { $each: highlights.map(h => ({ page: Number(h.page), text: String(h.text || ''), color: h.color ?? null })) };
  if (!Object.keys(ops).length) return { matched: 0, modified: 0 };
  const r = await db.collection(COLL).updateOne({ _id: sessionId, endAt: null }, { $push: ops });
  return { matched: r.matchedCount, modified: r.modifiedCount };
}

async function endReadingSession(sessionId) {
  const db = await getMongoDb();
  const now = new Date();
  const r = await db.collection(COLL).updateOne({ _id: sessionId, endAt: null }, { $set: { endAt: now } });
  return { matched: r.matchedCount, modified: r.modifiedCount, endAt: now };
}

function durationExpr(nowVar = '$$NOW') {
  return { $max: [0, { $subtract: [{ $ifNull: ['$endAt', nowVar] }, '$startAt'] }] };
}

/* Reports */
async function reportAvgSessionTimePerUser({ from, to } = {}) {
  const db = await getMongoDb();
  const match = {};
  if (from) match.startAt = { ...(match.startAt||{}), $gte: new Date(from) };
  if (to)   match.startAt = { ...(match.startAt||{}), $lte: new Date(to) };
  const pipeline = [
    ...(Object.keys(match).length ? [{ $match: match }] : []),
    { $project: { userId: 1, durationMs: durationExpr() } },
    { $group: { _id: '$userId', avgSessionMs: { $avg: '$durationMs' }, sessions: { $sum: 1 } } },
    { $project: { _id: 0, userId: '$_id', sessions: 1, avgSessionMs: { $round: ['$avgSessionMs', 0] },
                  avgSessionMinutes: { $round: [{ $divide: ['$avgSessionMs', 60000] }, 2] } } },
    { $sort: { avgSessionMs: -1 } },
  ];
  return db.collection(COLL).aggregate(pipeline).toArray();
}

async function reportMostHighlightedBooks({ limit = 10, from, to } = {}) {
  const db = await getMongoDb();
  const match = {};
  if (from) match.startAt = { ...(match.startAt||{}), $gte: new Date(from) };
  if (to)   match.startAt = { ...(match.startAt||{}), $lte: new Date(to) };
  const pipeline = [
    ...(Object.keys(match).length ? [{ $match: match }] : []),
    { $unwind: '$highlights' },
    { $group: { _id: '$bookId', highlightsCount: { $sum: 1 } } },
    { $project: { _id: 0, bookId: '$_id', highlightsCount: 1 } },
    { $sort: { highlightsCount: -1, bookId: 1 } },
    { $limit: Number(limit) },
  ];
  return db.collection(COLL).aggregate(pipeline).toArray();
}

async function reportTopBooksByTotalReadingTime({ limit = 10, from, to } = {}) {
  const db = await getMongoDb();
  const match = {};
  if (from) match.startAt = { ...(match.startAt||{}), $gte: new Date(from) };
  if (to)   match.startAt = { ...(match.startAt||{}), $lte: new Date(to) };
  const pipeline = [
    ...(Object.keys(match).length ? [{ $match: match }] : []),
    { $project: { bookId: 1, durationMs: durationExpr() } },
    { $group: { _id: '$bookId', totalMs: { $sum: '$durationMs' }, sessions: { $sum: 1 } } },
    { $project: { _id: 0, bookId: '$_id', sessions: 1,
                  totalMs: { $round: ['$totalMs', 0] },
                  totalHours: { $round: [{ $divide: ['$totalMs', 3600000] }, 2] } } },
    { $sort: { totalMs: -1 } },
    { $limit: Number(limit) },
  ];
  return db.collection(COLL).aggregate(pipeline).toArray();
}

module.exports = {
  startReadingSession, appendReadingActivity, endReadingSession,
  reportAvgSessionTimePerUser, reportMostHighlightedBooks, reportTopBooksByTotalReadingTime,
};
