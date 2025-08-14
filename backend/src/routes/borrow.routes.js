const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../../middlewares/authMiddleware');


// -------------------- Borrow a Book --------------------
router.post('/borrow', authenticateJWT, async (req, res) => {
  const { bookId, borrowAt, dueAt } = req.body; // 👈 now accepting custom dates
  const userId = req.user?.id;

  if (!bookId || !userId) {
    return res.status(400).json({ error: 'Missing bookId or userId' });
  }
  if (!borrowAt || !dueAt) {
    return res.status(400).json({ error: 'Missing borrowAt or dueAt' });
  }
  if (new Date(dueAt) <= new Date(borrowAt)) {
    return res.status(400).json({ error: 'dueAt must be after borrowAt' });
  }

  const conn = await req.db.getConnection();
  try {
    // use the new 4-arg procedure (see section 4)
    const [resultSets] = await conn.query('CALL BorrowBook(?, ?, ?, ?)', [
      userId,
      bookId,
      new Date(borrowAt), // MySQL DATETIME
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
  } catch (err) {
    console.error('❌ Borrow book error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error during borrow' });
  } finally {
    conn.release();
  }
});


router.post('/return', authenticateJWT, async (req, res) => {
  const { checkoutId } = req.body;
  if (!checkoutId) return res.status(400).json({ error: 'Missing checkoutId' });

  const conn = await req.db.getConnection();
  try {
    const [resultSets] = await conn.query('CALL ReturnBook(?)', [checkoutId]);
    const payload =
      Array.isArray(resultSets) && Array.isArray(resultSets[0]) && resultSets[0][0]
        ? resultSets[0][0]
        : null; // { book_id, available_copies, isLate }

    res.status(200).json({
      message: '✅ Book returned successfully',
      ...(payload || {}),
    });
  } catch (err) {
    console.error('❌ Return book error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error during return' });
  } finally {
    conn.release();
  }
});


// -------------------- Return a Book --------------------
router.post('/return', authenticateJWT, async (req, res) => {
  const { checkoutId } = req.body;
  if (!checkoutId) return res.status(400).json({ error: 'Missing checkoutId' });

  const conn = await req.db.getConnection();
  try {
    const [resultSets] = await conn.query('CALL ReturnBook(?)', [checkoutId]);
    const rows = Array.isArray(resultSets) ? resultSets[0] : [];
    const payload = rows && rows[0] ? rows[0] : {};
    res.status(200).json({
      message: '✅ Book returned successfully',
      book_id: payload.book_id,
      available_copies: payload.available_copies,
      isLate: !!payload.isLate
    });
  } catch (err) {
    console.error('❌ Return book error:', err.message);
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});


// -------------------- View Borrowed Books --------------------
// -------------------- View Borrowed Books --------------------
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
    console.error('❌ Get borrowed books error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
});


module.exports = router;
