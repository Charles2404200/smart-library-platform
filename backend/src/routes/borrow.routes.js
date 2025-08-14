const express = require('express');
const router = express.Router();
const authenticateJWT = require('../../middlewares/authMiddleware');

// -------------------- Borrow a Book --------------------
router.post('/borrow', authenticateJWT, async (req, res) => {
  const { bookId } = req.body;
  const userId = req.user?.id;

  if (!bookId || !userId) {
    return res.status(400).json({ error: 'Missing bookId or userId' });
  }

  const conn = await req.db.getConnection();
  try {
    const [resultSets] = await conn.query('CALL BorrowBook(?, ?)', [userId, bookId]);

    // MySQL returns [[rows], meta, ...]. The last SELECT of the proc is in resultSets[0][0]
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
  const userId = req.user?.id;

  const conn = await req.db.getConnection();
  try {
    const [rows] = await conn.query(`
      SELECT c.id as checkoutId, b.title, c.borrowDate, c.returnDate
      FROM checkouts c
      JOIN books b ON c.bookId = b.id
      WHERE c.userId = ?
      ORDER BY c.borrowDate DESC
    `, [userId]);

    res.status(200).json({ borrows: rows });
  } catch (err) {
    console.error('❌ Fetch borrow history error:', err.message);
    res.status(500).json({ error: 'Internal server error while fetching borrows' });
  } finally {
    conn.release();
  }
});


module.exports = router;
