// src/routes/ebooks.routes.js
const express = require('express');
const { authenticateJWT } = require('../../middlewares/authMiddleware');

const router = express.Router();

// Helpers for sendBeacon payloads (text/plain) or normal JSON
function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return {};
}

// POST /api/ebooks/:bookId/open
router.post('/:bookId/open', authenticateJWT, async (req, res) => {
  const bookId = parseInt(req.params.bookId, 10);
  if (!Number.isFinite(bookId) || bookId <= 0) {
    return res.status(400).json({ error: 'Invalid or missing bookId' });
  }

  // (Optional) Only allow if currently borrowed:
  // const [rows] = await req.db.query(
  //   'SELECT 1 FROM checkout WHERE userId = ? AND bookId = ? AND returnAt IS NULL LIMIT 1',
  //   [req.user.id, bookId]
  // );
  // if (!rows.length) return res.status(403).json({ error: 'Borrow this book to read.' });

  // Always serve the same demo EPUB
  const fileUrl = '/assets/default.epub';
  const sessionId = `${req.user.id}:${bookId}:${Date.now()}`;
  return res.json({ sessionId, fileUrl });
});

// POST /api/ebooks/:bookId/progress
router.post('/:bookId/progress', authenticateJWT, async (req, res) => {
  const bookId = parseInt(req.params.bookId, 10);
  if (!Number.isFinite(bookId) || bookId <= 0) return res.status(400).json({ error: 'Invalid or missing bookId' });
  const body = readJsonBody(req);
  // TODO: write progress (Mongo)
  return res.status(204).end();
});

// POST /api/ebooks/:bookId/end
router.post('/:bookId/end', authenticateJWT, async (req, res) => {
  const bookId = parseInt(req.params.bookId, 10);
  if (!Number.isFinite(bookId) || bookId <= 0) return res.status(400).json({ error: 'Invalid or missing bookId' });
  const body = readJsonBody(req);
  // TODO: close session (Mongo)
  return res.status(204).end();
});

module.exports = router;
