const fs = require('fs');
const path = require('path');
const { ObjectId } = require('mongodb');
const {
  startReadingSession,
  appendReadingActivity,
  endReadingSession
} = require('../services/readingAnalytics.service');
const { hasActiveBorrow, fetchBookFilePath } = require('../services/ebook.guard');
const { signReaderToken, verifyReaderToken } = require('../utils/readerToken');

async function openEbook(req, res) {
  const db = req.db;
  const userId = req.user?.id;
  const bookId = Number(req.params.bookId);
  if (!userId) return res.status(401).json({ error: 'Auth required' });

  const ok = await hasActiveBorrow(db, userId, bookId);
  if (!ok) return res.status(403).json({ error: 'Borrow this book before reading' });

  const filePath = await fetchBookFilePath(db, bookId);
  if (!filePath) return res.status(404).json({ error: 'eBook file not found' });

  const { _id: sessionId } = await startReadingSession({
    userId, bookId, device: req.get('User-Agent') || 'unknown', pagesRead: [], highlights: [], meta: {}
  });

  const token = signReaderToken({ userId, bookId, sessionId });
  const fileUrl = `/api/ebooks/${bookId}/content?token=${encodeURIComponent(token)}`;
  res.json({ sessionId: String(sessionId), token, fileUrl });
}

async function streamEbook(req, res) {
  const db = req.db;
  const bookId = Number(req.params.bookId);
  const payload = req.query.token && verifyReaderToken(String(req.query.token));
  if (!payload || Number(payload.bid) !== bookId) return res.status(401).json({ error: 'Invalid/expired token' });
  if (!(await hasActiveBorrow(db, payload.uid, bookId))) return res.status(403).json({ error: 'Borrow required' });

  const filePath = await fetchBookFilePath(db, bookId);
  if (!filePath) return res.status(404).json({ error: 'eBook file not found' });
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(abs)) return res.status(404).json({ error: 'File missing' });

  const stat = fs.statSync(abs);
  const contentType = abs.toLowerCase().endsWith('.epub') ? 'application/epub+zip' : 'application/pdf';

  const range = req.headers.range;
  if (!range) {
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=0, no-store',
    });
    return fs.createReadStream(abs).pipe(res);
  }
  const [s,e] = range.replace(/bytes=/,'').split('-');
  const start = parseInt(s,10);
  const end = e ? parseInt(e,10) : stat.size - 1;

  res.writeHead(206, {
    'Content-Range': `bytes ${start}-${end}/${stat.size}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': end - start + 1,
    'Content-Type': contentType,
    'Cache-Control': 'private, max-age=0, no-store',
  });
  fs.createReadStream(abs, { start, end }).pipe(res);
}

// beacon endpoints
async function postProgress(req, res) {
  try {
    const { sessionId, page, pagePercent, cfi } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    const pagesRead = Number.isFinite(Number(page)) ? [Number(page)] : [];
    await appendReadingActivity(new ObjectId(String(sessionId)), { pagesRead, pagePercent, cfi });
    res.json({ ok: true });
  } catch (e) {
    console.error('progress error', e);
    res.status(500).json({ error: 'progress failed' });
  }
}

async function postHighlight(req, res) {
  try {
    const { sessionId, page, text, color } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    await appendReadingActivity(new ObjectId(String(sessionId)), {
      highlights: [{ page: Number(page), text: String(text||''), color: color ?? null }]
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('highlight error', e);
    res.status(500).json({ error: 'highlight failed' });
  }
}

async function postEnd(req, res) {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    await endReadingSession(new ObjectId(String(sessionId)));
    res.json({ ok: true });
  } catch (e) {
    console.error('end session error', e);
    res.status(500).json({ error: 'end failed' });
  }
}

module.exports = { openEbook, streamEbook, postProgress, postHighlight, postEnd };
