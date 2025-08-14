const express = require('express');
const router = express.Router();

/**
 * GET /api/books
 * Fetch all books with author names and publisher
 */
// book.route.js
router.get('/', async (req, res) => {
  const conn = await req.db.getConnection();
  try {
    const [books] = await conn.query(`
      SELECT 
        b.book_id AS id,
        b.title,
        b.genre,
        p.name AS publisher,
        b.copies,
        b.available_copies,
        b.image_url,                              -- 👈 add this
        GROUP_CONCAT(a.name SEPARATOR ', ') AS authors
      FROM books b
      LEFT JOIN book_authors ba ON b.book_id = ba.book_id
      LEFT JOIN authors a ON ba.author_id = a.author_id
      LEFT JOIN publishers p ON b.publisher_id = p.publisher_id
      GROUP BY b.book_id
    `);

    res.json(books);
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
