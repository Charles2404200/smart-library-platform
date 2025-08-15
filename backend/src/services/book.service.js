// src/services/book.service.js

/**
 * Get all books with authors & publisher
 */
async function getAllBooks(db) {
  const [rows] = await db.query(`
    SELECT 
      b.book_id AS id,
      b.title,
      b.genre,
      p.name AS publisher,
      b.copies,
      b.available_copies,
      b.image_url,
      GROUP_CONCAT(a.name SEPARATOR ', ') AS authors
    FROM books b
    LEFT JOIN book_authors ba ON b.book_id = ba.book_id
    LEFT JOIN authors a       ON ba.author_id = a.author_id
    LEFT JOIN publishers p    ON b.publisher_id = p.publisher_id
    GROUP BY b.book_id
    ORDER BY b.book_id DESC
  `);
  return rows;
}

/**
 * Get book detail using id
 */
async function getBookById(db, bookId) {
  const [rows] = await db.query(
    `
    SELECT 
      b.book_id AS id,
      b.title,
      b.genre,
      p.name AS publisher,
      b.copies,
      b.available_copies,
      b.image_url,
      GROUP_CONCAT(a.name SEPARATOR ', ') AS authors
    FROM books b
    LEFT JOIN book_authors ba ON b.book_id = ba.book_id
    LEFT JOIN authors a       ON ba.author_id = a.author_id
    LEFT JOIN publishers p    ON b.publisher_id = p.publisher_id
    WHERE b.book_id = ?
    GROUP BY b.book_id
    `,
    [bookId]
  );
  return rows[0] || null;
}

/**
 * CHeck availability
 * (use available_copies; if null then use copies > 0)
 */
async function getAvailability(db, bookId) {
  const [rows] = await db.query(
    'SELECT copies, available_copies FROM books WHERE book_id = ? LIMIT 1',
    [bookId]
  );
  if (rows.length === 0) return null;

  const { copies, available_copies } = rows[0];
  const available =
    (available_copies != null ? available_copies : copies) > 0;

  return {
    available,
    copies,
    available_copies,
  };
}

module.exports = {
  getAllBooks,
  getBookById,
  getAvailability,
};
