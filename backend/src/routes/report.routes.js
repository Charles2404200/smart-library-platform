const express = require('express');
const router = express.Router();

// Most borrowed books in time range
router.get('/most-borrowed', async (req, res) => {
  const { start, end } = req.query;
  const db = req.db;

  try {
    const [rows] = await db.execute(`
      SELECT B.title, COUNT(C.id) AS borrow_count
      FROM Checkout C
      JOIN Book B ON C.bookId = B.id
      WHERE C.checkoutAt BETWEEN ? AND ?
      GROUP BY C.bookId
      ORDER BY borrow_count DESC
      LIMIT 10
    `, [start, end]);

    res.json(rows);
  } catch (err) {
    console.error('❌ Report error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Top active readers
router.get('/top-readers', async (req, res) => {
  const db = req.db;

  try {
    const [rows] = await db.execute(`
      SELECT U.name, COUNT(C.id) AS checkout_count
      FROM Checkout C
      JOIN User U ON C.userId = U.id
      GROUP BY C.userId
      ORDER BY checkout_count DESC
      LIMIT 10
    `);

    res.json(rows);
  } catch (err) {
    console.error('❌ Report error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Books with low availability
router.get('/low-stock', async (req, res) => {
  const db = req.db;

  try {
    const [rows] = await db.execute(`
      SELECT id, title, copies FROM Book
      WHERE copies <= 2
      ORDER BY copies ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error('❌ Report error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;
