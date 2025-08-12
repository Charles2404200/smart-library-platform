const express = require('express');
const router = express.Router();
const authenticateJWT = require('../../middlewares/authMiddleware');

/**
 * POST /api/borrow/borrow
 * Borrow a book
 */
router.post('/borrow', authenticateJWT, async (req, res) => {
  try {
    const { bookId } = req.body;
    const userId = req.user && (typeof req.user.id === 'number' ? req.user.id : Number(req.user.id));

    console.log('📥 Borrow Request (raw):', { user: req.user, body: req.body });

    if (!bookId || Number.isNaN(Number(bookId))) {
      return res.status(400).json({ error: 'Invalid or missing bookId' });
    }
    if (!userId || Number.isNaN(userId)) {
      return res.status(401).json({ error: 'Unauthorized: missing or invalid user' });
    }

    if (!req.db || typeof req.db.getConnection !== 'function') {
      console.error('❌ req.db is not available (middleware not mounted?)');
      return res.status(500).json({ error: 'Server DB configuration error' });
    }

    const conn = await req.db.getConnection();
    try {
      await conn.beginTransaction?.();

      const [rows] = await conn.query('CALL BorrowBook(?, ?)', [userId, Number(bookId)]);
      console.log('🔁 Raw BorrowBook response:', rows);

      await conn.commit?.();

      console.log('✅ BorrowBook completed:', { userId, bookId });
      return res.status(200).json({
        message: 'Book borrowed successfully',
        result: rows
      });
    } catch (innerErr) {
      await conn.rollback?.();
      console.error('❌ Borrow book error:', innerErr);
      return res.status(500).json({ error: 'Internal server error during borrow' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('❌ Unexpected error in /borrow route:', err);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
});

/**
 * POST /api/borrow/return
 * Return a borrowed book
 */
router.post('/return', authenticateJWT, async (req, res) => {
  const { checkoutId } = req.body;
  const userId = req.user?.id;

  if (!checkoutId) {
    return res.status(400).json({ error: 'Missing checkoutId' });
  }

  const conn = await req.db.getConnection();
  try {
    const [result] = await conn.query(
      `UPDATE checkout 
       SET return_at = NOW()
       WHERE id = ? AND user_id = ? AND return_at IS NULL`,
      [checkoutId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ error: 'Book already returned or not found' });
    }

    res.json({ message: 'Book returned successfully' });
  } catch (err) {
    console.error('❌ Error returning book:', err);
    res.status(500).json({ error: 'Internal server error while returning book' });
  } finally {
    conn.release();
  }
});

module.exports = router;
