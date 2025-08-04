const express = require('express');
const router = express.Router();

/**
 * POST /api/reviews
 * Add a review for a book
 * Body: { userId, bookId, rating (1-5), comment }
 */
router.post('/', async (req, res) => {
  const { userId, bookId, rating, comment } = req.body;

  if (!userId || !bookId || !rating) {
    return res.status(400).json({ error: 'Missing required fields: userId, bookId, rating' });
  }

  const conn = await req.db.getConnection();
  try {
    await conn.query(
      'INSERT INTO reviews (user_id, book_id, rating, comment, created_at) VALUES (?, ?, ?, ?, NOW())',
      [userId, bookId, rating, comment || null]
    );

    // Optional: Update avg rating of the book (or use trigger instead)
    await conn.query(`
      UPDATE books
      SET avg_rating = (
        SELECT ROUND(AVG(rating), 2) FROM reviews WHERE book_id = ?
      )
      WHERE id = ?
    `, [bookId, bookId]);

    res.status(201).json({ message: '✅ Review added successfully' });
  } catch (err) {
    console.error('❌ Error adding review:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
});

/**
 * GET /api/reviews/:bookId
 * Get all reviews for a specific book
 */
router.get('/:bookId', async (req, res) => {
  const { bookId } = req.params;

  const conn = await req.db.getConnection();
  try {
    const [reviews] = await conn.query(`
      SELECT r.id, r.rating, r.comment, r.created_at, u.name AS reviewer
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.book_id = ?
      ORDER BY r.created_at DESC
    `, [bookId]);

    res.json(reviews);
  } catch (err) {
    console.error('❌ Error fetching reviews:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
});

module.exports = router;
