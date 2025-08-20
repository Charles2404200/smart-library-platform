// src/services/book.service.js

// Escape % and _ for SQL LIKE
function likeEscape(s) {
  return String(s || '').replace(/[%_\\]/g, c => '\\' + c);
}

/**
 * Get all books with authors, publisher, and review aggregates
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
      GROUP_CONCAT(DISTINCT a.name ORDER BY a.name SEPARATOR ', ') AS authors,
      COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
      COUNT(r.id) AS reviews_count
    FROM books b
    LEFT JOIN publishers p    ON p.publisher_id = b.publisher_id
    LEFT JOIN book_authors ba ON ba.book_id     = b.book_id
    LEFT JOIN authors a       ON a.author_id    = ba.author_id
    LEFT JOIN review r        ON r.bookId       = b.book_id
    GROUP BY
      b.book_id, b.title, b.genre, p.name, b.copies, b.available_copies, b.image_url
    ORDER BY b.book_id DESC
  `);
  return rows;
}

/**
 * Get one book with authors, publisher, and review aggregates
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
      GROUP_CONCAT(DISTINCT a.name ORDER BY a.name SEPARATOR ', ') AS authors,
      COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
      COUNT(r.id) AS reviews_count
    FROM books b
    LEFT JOIN publishers p    ON p.publisher_id = b.publisher_id
    LEFT JOIN book_authors ba ON ba.book_id     = b.book_id
    LEFT JOIN authors a       ON a.author_id    = ba.author_id
    LEFT JOIN review r        ON r.bookId       = b.book_id
    WHERE b.book_id = ?
    GROUP BY
      b.book_id, b.title, b.genre, p.name, b.copies, b.available_copies, b.image_url
    `,
    [Number(bookId)]
  );
  return rows[0] || null;
}

/**
 * Check availability (quick)
 */
async function getAvailability(db, bookId) {
  const [rows] = await db.query(
    'SELECT copies, available_copies FROM books WHERE book_id = ? LIMIT 1',
    [Number(bookId)]
  );
  if (rows.length === 0) return null;

  const { copies, available_copies } = rows[0];
  const available = (available_copies != null ? available_copies : copies) > 0;
  return { available, copies, available_copies };
}

/**
 * Search books by *title only* with exact-match preference.
 *  - If q is numeric: try exact book_id first.
 *  - Try exact title match (case-insensitive) → if found, return only exact matches.
 *  - Else fallback to title LIKE %q% (case-insensitive).
 * Supports: minRating, pagination, returns avg_rating & reviews_count.
 */
async function searchBooks(db, opts = {}) {
  const {
    q = '',
    minRating,
    page = 1,
    pageSize = 24,
  } = opts;

  const limit  = Math.min(50, Math.max(1, Number(pageSize) || 24));
  const offset = Math.max(0, (Number(page) - 1) * limit);

  const qTrim  = String(q || '').trim();
  const qLower = qTrim.toLowerCase();

  // escape % _ \ for LIKE
  const likeEscape = (s) => String(s || '').replace(/[%_\\]/g, c => '\\' + c);
  const likeQ  = `%${likeEscape(qTrim)}%`;

  // Common SELECT using correlated subqueries for review aggregates
  async function runQuery(whereSQL, whereParams) {
    const havingMin = (typeof minRating === 'number');

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
        GROUP_CONCAT(DISTINCT a.name ORDER BY a.name SEPARATOR ', ') AS authors,
        /* aggregates via subqueries to avoid GROUP BY issues */
        COALESCE((
          SELECT ROUND(AVG(r2.rating), 1)
          FROM review r2
          WHERE r2.bookId = b.book_id
        ), 0) AS avg_rating,
        (
          SELECT COUNT(*)
          FROM review r3
          WHERE r3.bookId = b.book_id
        ) AS reviews_count
      FROM books b
      LEFT JOIN publishers p    ON p.publisher_id = b.publisher_id
      LEFT JOIN book_authors ba ON ba.book_id     = b.book_id
      LEFT JOIN authors a       ON a.author_id    = ba.author_id
      ${whereSQL}
      GROUP BY
        b.book_id, b.title, b.genre, p.name, b.copies, b.available_copies, b.image_url
      HAVING 1=1
        ${havingMin ? ' AND avg_rating >= ?' : ''}
      ORDER BY b.title ASC
      LIMIT ? OFFSET ?
      `,
      [
        ...whereParams,
        ...(havingMin ? [Number(minRating)] : []),
        limit, offset,
      ]
    );
    return rows;
  }

  // 1) Numeric q -> exact book_id
  if (/^\d+$/.test(qTrim)) {
    const byId = await runQuery(`WHERE b.book_id = ?`, [Number(qTrim)]);
    if (byId.length) return byId;
  }

  // 2) Exact title (case-insensitive) -> only exact matches
  const exact = await runQuery(`WHERE LOWER(b.title) = ?`, [qLower]);
  if (exact.length) return exact;

  // 3) Fallback: title LIKE %q%  (IMPORTANT: ESCAPE '\\\\')
  const like = await runQuery(`WHERE b.title LIKE ? ESCAPE '\\\\'`, [likeQ]);
  return like;
}


module.exports = {
  getAllBooks,
  getBookById,
  getAvailability,
  searchBooks, // ← make sure this is exported
};
