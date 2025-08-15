// src/controllers/search.controller.js
async function searchBooks(req, res) {
  const { title, author, genre, publisher } = req.query;
  const db = req.db;

  try {
    const [rows] = await db.query(`
      SELECT 
        b.book_id AS id,
        b.title,
        GROUP_CONCAT(DISTINCT a.name ORDER BY a.name SEPARATOR ', ') AS authors,
        p.name AS publisher,
        b.genre,
        b.available_copies,
        b.copies
      FROM books b
      LEFT JOIN book_authors ba ON b.book_id = ba.book_id
      LEFT JOIN authors a       ON ba.author_id = a.author_id
      LEFT JOIN publishers p    ON b.publisher_id = p.publisher_id
      WHERE ( ? IS NULL OR b.title LIKE CONCAT('%', ?, '%') )
        AND ( ? IS NULL OR a.name LIKE CONCAT('%', ?, '%') )
        AND ( ? IS NULL OR b.genre LIKE CONCAT('%', ?, '%') )
        AND ( ? IS NULL OR p.name LIKE CONCAT('%', ?, '%') )
      GROUP BY b.book_id
      ORDER BY b.title ASC
    `, [
      title || null, title || null,
      author || null, author || null,
      genre || null, genre || null,
      publisher || null, publisher || null
    ]);

    res.json(rows);
  } catch (err) {
    console.error('❌ Search books error:', err);
    res.status(500).json({ error: 'Failed to search books' });
  }
}

module.exports = { searchBooks };
