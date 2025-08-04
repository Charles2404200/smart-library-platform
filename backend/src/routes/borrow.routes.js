// routes/borrow.routes.js
const express = require('express');
const router = express.Router();

/**
 * POST /api/borrow/borrow
 * Calls the stored procedure BorrowBook(userId, bookId)
 */
router.post('/borrow', async (req, res) => {
  const { userId, bookId } = req.body;

  if (!userId || !bookId) {
    return res.status(400).json({ error: 'Missing userId or bookId' });
  }

  const conn = await req.db.getConnection();
  try {
    const [result] = await conn.query('CALL BorrowBook(?, ?)', [userId, bookId]);
    res.status(200).json({
      message: '✅ Book borrowed successfully',
      result: result,
    });
  } catch (err) {
    console.error('❌ Borrow book error:', err);
    res.status(500).json({ error: 'Internal server error during borrow' });
  } finally {
    conn.release();
  }
});

/**
 * POST /api/borrow/return
 * Calls the stored procedure ReturnBook(checkoutId)
 */
router.post('/return', async (req, res) => {
  const { checkoutId } = req.body;

  if (!checkoutId) {
    return res.status(400).json({ error: 'Missing checkoutId' });
  }

  const conn = await req.db.getConnection();
  try {
    const [result] = await conn.query('CALL ReturnBook(?)', [checkoutId]);
    res.status(200).json({
      message: '✅ Book returned successfully',
      result: result,
    });
  } catch (err) {
    console.error('❌ Return book error:', err);
    res.status(500).json({ error: 'Internal server error during return' });
  } finally {
    conn.release();
  }
});

module.exports = router;
