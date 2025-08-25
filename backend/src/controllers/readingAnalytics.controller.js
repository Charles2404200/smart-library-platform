const {
  reportAvgSessionTimePerUser,
  reportMostHighlightedBooks,
  reportTopBooksByTotalReadingTime
} = require('../services/readingAnalytics.service');

function parseRange(q) {
  const from = q.from ? new Date(q.from) : undefined;
  const to   = q.to   ? new Date(q.to)   : undefined;
  return { from, to };
}

async function getAvgSessionTimePerUser(req, res) {
  try {
    const data = await reportAvgSessionTimePerUser(parseRange(req.query));
    res.json({ data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to compute average session time' });
  }
}

async function getMostHighlightedBooks(req, res) {
  try {
    const { limit } = req.query;
    const data = await reportMostHighlightedBooks({ ...parseRange(req.query), limit: Number(limit || 10) });
    res.json({ data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to compute highlighted books' });
  }
}

async function getTopBooksByTotalTime(req, res) {
  try {
    const { limit } = req.query;
    const data = await reportTopBooksByTotalReadingTime({ ...parseRange(req.query), limit: Number(limit || 10) });
    res.json({ data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to compute top reading time' });
  }
}

module.exports = {
  getAvgSessionTimePerUser,
  getMostHighlightedBooks,
  getTopBooksByTotalTime,
};
