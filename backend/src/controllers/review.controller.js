// src/controllers/review.controller.js

// GET /api/reviews/book/:bookId
async function listByBook(req, res) {
  const db = req.db;
  const bookId = Number(req.params.bookId);
  if (!Number.isInteger(bookId)) {
    return res.status(400).json({ error: 'Invalid bookId' });
  }
  try {
    const [rows] = await db.query(
      `SELECT r.id, r.userId, u.name AS userName, r.rating, r.comment, r.createdAt
       FROM review r
       JOIN users u ON u.id = r.userId
       WHERE r.bookId = ?
       ORDER BY r.createdAt DESC`,
      [bookId]
    );
    const [agg] = await db.query(
      `SELECT ROUND(AVG(rating),2) AS avgRating, COUNT(*) AS count
       FROM review WHERE bookId = ?`,
      [bookId]
    );
    res.json({
      reviews: rows,
      avgRating: Number(agg[0]?.avgRating || 0),
      count: Number(agg[0]?.count || 0),
    });
  } catch (err) {
    console.error('❌ list reviews error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
}

// POST /api/reviews   { bookId, rating(1-5), comment }
async function upsert(req, res) {
  const db = req.db;
  const userId = req.user?.id;
  let { bookId, rating, comment } = req.body;

  bookId = Number(bookId);
  rating = Math.trunc(Number(rating));
  comment = (comment ?? '').toString();

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!Number.isInteger(bookId) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'bookId and rating(1..5) are required' });
  }

  try {
    // Optional: ensure the book exists (prevents FK errors)
    const [bookRows] = await db.query('SELECT 1 FROM books WHERE book_id = ? LIMIT 1', [bookId]);
    if (bookRows.length === 0) return res.status(404).json({ error: 'Book not found' });

    // ✅ Atomic upsert using the UNIQUE (userId, bookId) constraint
    const sql = `
      INSERT INTO review (userId, bookId, rating, comment, createdAt)
      VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        rating = VALUES(rating),
        comment = VALUES(comment),
        createdAt = NOW(),
        id = LAST_INSERT_ID(id)  -- return existing row id via insertId
    `;
    const [result] = await db.query(sql, [userId, bookId, rating, comment || null]);

    const [[me]] = await db.query(
      `SELECT id, userId, rating, comment, createdAt
       FROM review
       WHERE id = ?`,
      [result.insertId]
    );

    const [[agg]] = await db.query(
      `SELECT ROUND(AVG(rating),2) AS avgRating, COUNT(*) AS count
       FROM review WHERE bookId = ?`,
      [bookId]
    );

    return res.json({
      message: 'Saved',
      myReview: me || null,
      avgRating: Number(agg?.avgRating || 0),
      count: Number(agg?.count || 0),
    });
  } catch (err) {
    console.error('❌ upsert review error:', err);
    // As an extra safety, if something still collided, do a fallback update:
    if (err?.code === 'ER_DUP_ENTRY') {
      try {
        await db.query(
          'UPDATE review SET rating = ?, comment = ?, createdAt = NOW() WHERE userId = ? AND bookId = ?',
          [rating, comment || null, userId, bookId]
        );
        const [[me]] = await db.query(
          `SELECT id, userId, rating, comment, createdAt
           FROM review WHERE userId = ? AND bookId = ?`,
          [userId, bookId]
        );
        const [[agg]] = await db.query(
          `SELECT ROUND(AVG(rating),2) AS avgRating, COUNT(*) AS count
           FROM review WHERE bookId = ?`,
          [bookId]
        );
        return res.json({
          message: 'Saved',
          myReview: me || null,
          avgRating: Number(agg?.avgRating || 0),
          count: Number(agg?.count || 0),
        });
      } catch (e2) {
        console.error('❌ fallback update failed:', e2);
      }
    }
    return res.status(500).json({ error: 'Failed to save review' });
  }
}


// DELETE /api/reviews/:id  (owner or staff/admin)
async function remove(req, res) {
  const db = req.db;
  const reviewId = Number(req.params.id);
  const user = req.user;

  if (!Number.isInteger(reviewId)) {
    return res.status(400).json({ error: 'Invalid review id' });
  }

  try {
    const [[row]] = await db.query(
      'SELECT userId FROM review WHERE id = ? LIMIT 1',
      [reviewId]
    );
    if (!row) return res.status(404).json({ error: 'Review not found' });

    const isOwner = row.userId === user.id;
    const isStaff = user.role === 'staff' || user.role === 'admin';
    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await db.query('DELETE FROM review WHERE id = ?', [reviewId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('❌ delete review error:', err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
}

module.exports = { listByBook, upsert, remove };
