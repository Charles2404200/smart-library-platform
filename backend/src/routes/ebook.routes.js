// src/routes/ebooks.routes.js
const express = require('express');
const { ObjectId } = require('mongodb');
const { authenticateJWT } = require('../../middlewares/authMiddleware');

const {
  startReadingSession,
  appendReadingActivity,
  endReadingSession,
} = require('../services/readingAnalytics.service');

const { hasActiveBorrow, fetchBookFilePath } = require('../services/ebook.guard');
const { signReaderToken, verifyReaderToken } = require('../utils/readerToken');

const router = express.Router();

// Helpers for sendBeacon payloads (text/plain) or normal JSON
function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return {};
}

/**
 * POST /api/ebooks/:bookId/open
 * - Verifies the user has an active borrow
 * - Starts a Mongo reading session
 * - Returns sessionId + (optional) streaming URL with short-lived token
 **/
router.post('/:bookId/open', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user?.id;
    const bookId = parseInt(req.params.bookId, 10);
    if (!userId) return res.status(401).json({ error: 'Auth required' });
    if (!Number.isFinite(bookId) || bookId <= 0) {
      return res.status(400).json({ error: 'Invalid or missing bookId' });
    }

    // Bypass borrow check only if you set FAKEBOOK_MODE=1 for demos
    const isDemo = process.env.FAKEBOOK_MODE === '1';

    // Enforce active borrow (MySQL) unless demo
    if (!isDemo) {
      const ok = await hasActiveBorrow(req.db, userId, bookId);
      if (!ok) return res.status(403).json({ error: 'Borrow this book before reading' });
    }

    // If you later want per-book files, use fetchBookFilePath(req.db, bookId)
    // and return a signed /content URL. For now we stick to your fakebook asset:
    const fileUrl = '/assets/fakebook.pdf';

    // Start analytics session in Mongo
    const { _id: sessionId } = await startReadingSession({
      userId,
      bookId,
      device: req.get('User-Agent') || 'unknown',
      pagesRead: [],
      highlights: [],
      meta: {},
    });

    
    const token = signReaderToken({ userId, bookId, sessionId });

    return res.json({
      sessionId: String(sessionId),
      token,     // FE may ignore this for now
      fileUrl,   // current demo uses static fakebook asset
    });
  } catch (e) {
    console.error('open error', e);
    res.status(500).json({ error: 'Failed to open eBook' });
  }
});



/**
 * POST /api/ebooks/:bookId/progress
 */
router.post('/:bookId/progress', authenticateJWT, async (req, res) => {
  try {
    const bookId = parseInt(req.params.bookId, 10);
    if (!Number.isFinite(bookId) || bookId <= 0) {
      return res.status(400).json({ error: 'Invalid or missing bookId' });
    }
    const body = readJsonBody(req);
    const { sessionId } = body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    const payload = {};
    if (Number.isFinite(Number(body.page))) payload.pagesRead = [Number(body.page)];
    if (typeof body.pagePercent === 'number') payload.pagePercent = body.pagePercent;
    if (typeof body.cfi === 'string') payload.cfi = body.cfi;

    if (!Object.keys(payload).length) return res.status(204).end();

    await appendReadingActivity(new ObjectId(String(sessionId)), payload);
    return res.status(204).end();
  } catch (e) {
    console.error('progress error', e);
    res.status(500).json({ error: 'progress failed' });
  }
});

/**
 * POST /api/ebooks/:bookId/highlight
 * Accepts { sessionId, page, text, color? }
 */
router.post('/:bookId/highlight', authenticateJWT, async (req, res) => {
  try {
    const bookId = parseInt(req.params.bookId, 10);
    if (!Number.isFinite(bookId) || bookId <= 0) {
      return res.status(400).json({ error: 'Invalid or missing bookId' });
    }
    const body = readJsonBody(req);
    const { sessionId, page, text, color } = body || {};
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    if (!Number.isFinite(Number(page))) return res.status(400).json({ error: 'page required' });

    await appendReadingActivity(new ObjectId(String(sessionId)), {
      highlights: [{ page: Number(page), text: String(text || ''), color: color ?? null }],
    });
    return res.status(204).end();
  } catch (e) {
    console.error('highlight error', e);
    res.status(500).json({ error: 'highlight failed' });
  }
});

/**
 * POST /api/ebooks/:bookId/end
 * Accepts { sessionId } and closes the reading session (sets endAt)
 */
router.post('/:bookId/end', authenticateJWT, async (req, res) => {
  try {
    const bookId = parseInt(req.params.bookId, 10);
    if (!Number.isFinite(bookId) || bookId <= 0) {
      return res.status(400).json({ error: 'Invalid or missing bookId' });
    }
    const body = readJsonBody(req);
    const { sessionId } = body || {};
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    await endReadingSession(new ObjectId(String(sessionId)));
    return res.status(204).end();
  } catch (e) {
    console.error('end session error', e);
    res.status(500).json({ error: 'end failed' });
  }
});

module.exports = router;
