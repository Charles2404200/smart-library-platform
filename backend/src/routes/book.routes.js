const express = require('express');
const router = express.Router();

/**
 * GET /api/books
 * Fetch all books with author names and publisher
 */
router.get('/', async (req, res) => {
  const conn = await req.db.getConnection();
  try {
    const [books] = await conn.query(`
      SELECT 
        b.id,
        b.title,
        b.genre,
        b.publisher,
        b.copies,
        GROUP_CONCAT(a.name SEPARATOR ', ') AS authors
      FROM Book b
      LEFT JOIN BookAuthor ba ON b.id = ba.bookId
      LEFT JOIN Author a ON ba.authorId = a.id
      GROUP BY b.id
    `);

    res.json(books); // ✅ Return array of books
  } catch (err) {
    console.error('❌ Error fetching books:', err);
    res.status(500).json({ error: 'Internal server error while fetching books' });
  } finally {
    conn.release();
  }
});

/**
 * GET /api/books/:bookId
 * Get a single book by ID
 */
router.get('/:bookId', async (req, res) => {
  const { bookId } = req.params;
  const conn = await req.db.getConnection();
  try {
    const [rows] = await conn.query(`
      SELECT 
        b.id,
        b.title,
        b.genre,
        b.publisher,
        b.copies,
        GROUP_CONCAT(a.name SEPARATOR ', ') AS authors
      FROM Book b
      LEFT JOIN BookAuthor ba ON b.id = ba.bookId
      LEFT JOIN Author a ON ba.authorId = a.id
      WHERE b.id = ?
      GROUP BY b.id
    `, [bookId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('❌ Error fetching book:', err);
    res.status(500).json({ error: 'Internal server error while fetching book' });
  } finally {
    conn.release();
  }
});

/**
 * GET /api/books/:bookId/availability
 * Check if a book is available based on copies > 0
 */
router.get('/:bookId/availability', async (req, res) => {
  const { bookId } = req.params;
  const conn = await req.db.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT copies FROM Book WHERE id = ?', 
      [bookId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const available = rows[0].copies > 0;
    res.json({ available, copies: rows[0].copies });
  } catch (err) {
    console.error('❌ Error checking availability:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
});

module.exports = router;
