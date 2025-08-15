// routes/borrow.route.js
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../../middlewares/authMiddleware');

/**
 * POST /api/borrow/borrow
 * Borrow a book: creates a checkout via SP BorrowBook(userId, bookId, borrowAt, dueAt)
 * Body: { bookId: number, borrowAt?: ISOString, dueAt?: ISOString }
 */
router.post('/borrow', authenticateJWT, async (req, res) => {
  let { bookId, borrowAt, dueAt } = req.body;
  const userId = req.user?.id;

  if (!bookId || !userId) {
    return res.status(400).json({ error: 'Missing bookId or userId' });
  }

  // Sensible defaults if not provided by client
  const now = new Date();
  if (!borrowAt) borrowAt = now.toISOString();
  if (!dueAt) {
    const d = new Date(now);
    d.setDate(d.getDate() + 14); // default loan: 14 days
    dueAt = d.toISOString();
  }

  if (new Date(dueAt) <= new Date(borrowAt)) {
    return res.status(400).json({ error: 'dueAt must be after borrowAt' });
  }

  const conn = await req.db.getConnection();
  try {
    const [resultSets] = await conn.query('CALL BorrowBook(?, ?, ?, ?)', [
      userId,
      Number(bookId),
      new Date(borrowAt),
      new Date(dueAt),
    ]);

    const payload =
      Array.isArray(resultSets) && Array.isArray(resultSets[0]) && resultSets[0][0]
        ? resultSets[0][0]
        : null; // { book_id, available_copies }

    res.status(200).json({
      message: '✅ Book borrowed successfully',
      ...(payload || {}),
    });

    // 🔔 Realtime update for this user
    try {
      const io = req.app.get('io');
      if (io && userId) {
        io.to(`user:${userId}`).emit('borrows:changed', { userId });
      }
    } catch (_) {}
  } catch (err) {
    console.error('❌ Borrow book error:', err.message || err);
    res.status(500).json({ error: err.message || 'Internal server error during borrow' });
  } finally {
    conn.release();
  }
});

/**
 * POST /api/borrow/return
 * Return a book: marks return via SP ReturnBook(checkoutId)
 * Body: { checkoutId: number }
 */
router.post('/return', authenticateJWT, async (req, res) => {
  const { checkoutId } = req.body;
  const userId = req.user?.id;

  if (!checkoutId) {
    return res.status(400).json({ error: 'Missing checkoutId' });
  }

  const conn = await req.db.getConnection();
  try {
    const [resultSets] = await conn.query('CALL ReturnBook(?)', [Number(checkoutId)]);
    const payload =
      Array.isArray(resultSets) && Array.isArray(resultSets[0]) && resultSets[0][0]
        ? resultSets[0][0]
        : null; // { book_id, available_copies, isLate }

    res.status(200).json({
      message: '✅ Book returned successfully',
      ...(payload || {}),
    });

    // 🔔 Realtime update for this user
    try {
      const io = req.app.get('io');
      if (io && userId) {
        io.to(`user:${userId}`).emit('borrows:changed', { userId });
      }
    } catch (_) {}
  } catch (err) {
    console.error('❌ Return book error:', err.message || err);
    res.status(500).json({ error: err.message || 'Internal server error during return' });
  } finally {
    conn.release();
  }
});

/**
 * GET /api/borrow/my-borrows
 * List current user's borrow history (active + returned), newest first.
 * Returns: [{ checkoutId, title, checkoutAt, dueAt, returnAt, overdue }]
 */
router.get('/my-borrows', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const conn = await req.db.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT
         c.id AS checkoutId,
         b.title,
         c.checkoutAt,
         c.dueAt,
         c.returnAt,
         (c.returnAt IS NULL AND c.dueAt IS NOT NULL AND NOW() > c.dueAt) AS overdue
       FROM checkout c
       JOIN books b ON b.book_id = c.bookId
       WHERE c.userId = ?
       ORDER BY c.checkoutAt DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ Get borrowed books error:', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
});

module.exports = router;
