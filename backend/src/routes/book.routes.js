const express = require('express');
const router = express.Router();
const authenticateJWT = require('../../middlewares/authMiddleware');

router.get('/', authenticateJWT, async (req, res) => {
  const userId = req.user?.id;
  const conn = await req.db.getConnection();
  try {
    const [books] = await conn.query(`
      SELECT 
        b.book_id AS id,
        b.title,
        b.genre,
        p.name AS publisher,
        b.copies,
        GROUP_CONCAT(a.name SEPARATOR ', ') AS authors,
        CASE 
          WHEN EXISTS (
            SELECT 1
            FROM checkout c
            WHERE c.book_id = b.book_id
              AND c.user_id = ?
              AND c.return_at IS NULL
          ) THEN TRUE
          ELSE FALSE
        END AS borrowed,
        (
          SELECT c.id
          FROM checkout c
          WHERE c.book_id = b.book_id
            AND c.user_id = ?
            AND c.return_at IS NULL
          LIMIT 1
        ) AS checkoutId
      FROM books b
      LEFT JOIN book_authors ba ON b.book_id = ba.book_id
      LEFT JOIN authors a ON ba.author_id = a.author_id
      LEFT JOIN publishers p ON b.publisher_id = p.publisher_id
      GROUP BY b.book_id
    `, [userId, userId]);

    res.json(books);
  } catch (err) {
    console.error('❌ Error fetching books:', err);
    res.status(500).json({ error: 'Internal server error while fetching books' });
  } finally {
    conn.release();
  }
});

module.exports = router;
