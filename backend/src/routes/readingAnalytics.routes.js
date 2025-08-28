// src/routes/readingAnalytics.route.js
const express = require('express');
const { authenticateJWT } = require('../../middlewares/authMiddleware');

const {
  reportAvgSessionTimePerUser,
  reportMostHighlightedBooks,
  reportTopBooksByTotalReadingTime,
} = require('../services/readingAnalytics.service'); // <-- native Mongo service

const router = express.Router();

/* ------------ helpers ------------- */

function parseDate(v) {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}
function parseRange(q) {
  return { from: parseDate(q.from), to: parseDate(q.to) };
}
function sendMaybeCsv(res, data, { filename = 'report.csv', fields = [], format } = {}) {
  if (String(format).toLowerCase() !== 'csv') return res.json({ data });

  // Build CSV safely
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    // wrap in quotes if contains comma/quote/newline
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const header = fields.map((f) => f.label).join(',');
  const rows = (data || []).map((row) =>
    fields.map((f) => esc(row[f.key])).join(',')
  );
  const csv = [header, ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(csv);
}

/* ------------ routes ------------- */

/**
 * GET /api/analytics/reports/avg-session-time?from=2025-08-01&to=2025-08-31&format=json|csv
 * Response (json): { data: [{ userId, sessions, avgSessionMs, avgSessionMinutes }] }
 */
router.get('/reports/avg-session-time', authenticateJWT, async (req, res) => {
  try {
    const range = parseRange(req.query);
    const data = await reportAvgSessionTimePerUser(range);
    return sendMaybeCsv(res, data, {
      filename: 'avg-session-time.csv',
      format: req.query.format,
      fields: [
        { key: 'userId', label: 'userId' },
        { key: 'sessions', label: 'sessions' },
        { key: 'avgSessionMs', label: 'avgSessionMs' },
        { key: 'avgSessionMinutes', label: 'avgSessionMinutes' },
      ],
    });
  } catch (e) {
    console.error('avg-session-time error', e);
    res.status(500).json({ error: 'Failed to compute average session time' });
  }
});

/**
 * GET /api/analytics/reports/most-highlighted?limit=10&from=...&to=...&format=json|csv
 * Response (json): { data: [{ bookId, highlightsCount }] }
 */
router.get('/reports/most-highlighted', authenticateJWT, async (req, res) => {
  try {
    const range = parseRange(req.query);
    const limit = Number(req.query.limit || 10);
    const data = await reportMostHighlightedBooks({ ...range, limit });
    return sendMaybeCsv(res, data, {
      filename: 'most-highlighted-books.csv',
      format: req.query.format,
      fields: [
        { key: 'bookId', label: 'bookId' },
        { key: 'highlightsCount', label: 'highlightsCount' },
      ],
    });
  } catch (e) {
    console.error('most-highlighted error', e);
    res.status(500).json({ error: 'Failed to compute most highlighted books' });
  }
});

/**
 * GET /api/analytics/reports/top-books-time?limit=10&from=...&to=...&format=json|csv
 * Response (json): { data: [{ bookId, sessions, totalMs, totalHours }] }
 */
router.get('/reports/top-books-time', authenticateJWT, async (req, res) => {
  try {
    const range = parseRange(req.query);
    const limit = Number(req.query.limit || 10);
    const data = await reportTopBooksByTotalReadingTime({ ...range, limit });
    return sendMaybeCsv(res, data, {
      filename: 'top-books-by-total-time.csv',
      format: req.query.format,
      fields: [
        { key: 'bookId', label: 'bookId' },
        { key: 'sessions', label: 'sessions' },
        { key: 'totalMs', label: 'totalMs' },
        { key: 'totalHours', label: 'totalHours' },
      ],
    });
  } catch (e) {
    console.error('top-books-time error', e);
    res.status(500).json({ error: 'Failed to compute top books by total time' });
  }
});

module.exports = router;
