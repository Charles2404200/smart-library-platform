// src/controllers/borrow.controller.js
const BorrowService = require('../services/borrow.service');

async function borrowBook(req, res) {
  let { bookId, borrowAt, dueAt } = req.body;
  const userId = req.user?.id;

  if (!bookId || !userId) {
    return res.status(400).json({ error: 'Missing bookId or userId' });
  }

  const now = new Date();
  if (!borrowAt) borrowAt = now.toISOString();
  if (!dueAt) {
    const d = new Date(now);
    d.setDate(d.getDate() + 14);
    dueAt = d.toISOString();
  }

  if (new Date(dueAt) <= new Date(borrowAt)) {
    return res.status(400).json({ error: 'dueAt must be after borrowAt' });
  }

  const conn = await req.db.getConnection();
  try {
    const payload = await BorrowService.borrowBook(conn, userId, bookId, borrowAt, dueAt);

    res.status(200).json({
      message: '✅ Book borrowed successfully',
      ...(payload || {}),
    });

    // realtime
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
}

async function returnBook(req, res) {
  const { checkoutId } = req.body;
  const userId = req.user?.id;

  if (!checkoutId) {
    return res.status(400).json({ error: 'Missing checkoutId' });
  }

  const conn = await req.db.getConnection();
  try {
    const payload = await BorrowService.returnBook(conn, checkoutId);

    res.status(200).json({
      message: '✅ Book returned successfully',
      ...(payload || {}),
    });

    // realtime
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
}

async function getMyBorrows(req, res) {
  const userId = req.user.id;
  const conn = await req.db.getConnection();
  try {
    const rows = await BorrowService.getMyBorrows(conn, userId);
    res.json(rows);
  } catch (err) {
    console.error('❌ Get borrowed books error:', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
}

module.exports = {
  borrowBook,
  returnBook,
  getMyBorrows,
};
