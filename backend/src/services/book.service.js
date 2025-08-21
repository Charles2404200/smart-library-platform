// backend/src/services/book.service.js
// Robust book service: getAllBooks, getBookById, getAvailability, and searchBooks
// Supports named advanced filters (title, author, genre, publisher) + legacy q fallback.

/* Helper: escape %, _, \ for SQL LIKE when using ESCAPE '\\' */
function likeEscape(s) {
  return String(s || '').replace(/([%_\\])/g, '\\$1');
}

/* Get all books (paginated) */
async function getAllBooks(db, opts = {}) {
  const page = Math.max(1, Number(opts.page || 1));
  const pageSize = Math.max(1, Number(opts.pageSize || 24));
  const offset = (page - 1) * pageSize;

  const [rows] = await db.query(`
    SELECT
      b.book_id AS id,
      b.title,
      b.genre,
      b.retired,
      b.retired_at,
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
    LIMIT ? OFFSET ?
  `, [pageSize, offset]);

  return rows;
}

/* Get one book by ID */
async function getBookById(db, bookId) {
  const [rows] = await db.query(`
    SELECT
      b.book_id AS id,
      b.title,
      b.genre,
      b.retired,
      b.retired_at,
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
    LIMIT 1
  `, [Number(bookId)]);
  return rows && rows.length ? rows[0] : null;
}

/* Short availability helper */
async function getAvailability(db, bookId) {
  const [rows] = await db.query(
    'SELECT copies, available_copies, retired FROM books WHERE book_id = ? LIMIT 1',
    [Number(bookId)]
  );
  if (!rows || rows.length === 0) return null;
  const { copies, available_copies, retired } = rows[0];
  const availableCount = (available_copies != null ? available_copies : copies);
  return { available: !retired && availableCount > 0, copies, available_copies, retired: !!retired };
}

/* Main search implementation:
 * Accepts opts: { q, title, author, genre, publisher, minRating, page, pageSize, sort }
 * If any named filter (title/author/genre/publisher/minRating) provided -> use AND based query.
 * Else if q provided -> keep legacy behavior (id exact -> title exact -> title LIKE).
 */
async function searchBooks(db, opts = {}) {
  const {
    q = '',
    title = '',
    author = '',
    genre = '',
    publisher = '',
    minRating,
    page = 1,
    pageSize = 24,
    sort = 'relevance',
  } = opts || {};

  const pageNum = Math.max(1, Number(page || 1));
  const limit = Math.min(50, Math.max(1, Number(pageSize || 24)));
  const offset = (pageNum - 1) * limit;

  const tTitle = (title || '').toString().trim();
  const tAuthor = (author || '').toString().trim();
  const tGenre = (genre || '').toString().trim();
  const tPublisher = (publisher || '').toString().trim();
  const tQ = (q || '').toString().trim();
  const hasNamed = Boolean(tTitle || tAuthor || tGenre || tPublisher || (minRating != null && minRating !== ''));

  // Helper to run the aggregated query with a WHERE clause fragment
  async function runQuery(whereSQL, whereParams = []) {
    const havingMin = (minRating != null && minRating !== '');
    const params = [...whereParams];

    // Build full SQL with GROUP_CONCAT & aggregates similar to getAllBooks
    const sql = `
      SELECT
        b.book_id AS id,
        b.title,
        b.genre,
        b.retired,
        b.retired_at,
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
      ${whereSQL || ''}
      GROUP BY
        b.book_id, b.title, b.genre, p.name, b.copies, b.available_copies, b.image_url
      HAVING 1=1
      ${havingMin ? ' AND avg_rating >= ?' : ''}
      ORDER BY ${sort === 'newest' ? 'b.created_at DESC' : 'b.title ASC'}
      LIMIT ? OFFSET ?
    `;

    if (havingMin) params.push(Number(minRating));
    params.push(limit, offset);

    const [rows] = await db.query(sql, params);
    return rows;
  }

  // If named filters are present -> build AND-based WHERE using columns/joins
  if (hasNamed) {
    const conditions = [];
    const params = [];

    if (tTitle.length > 0) {
      // title LIKE
      const esc = likeEscape(tTitle);
      conditions.push('b.title LIKE ? ESCAPE \'\\\\\'');
      params.push(`%${esc}%`);
    }

    if (tAuthor.length > 0) {
      // match authors table (authors alias 'a' available via LEFT JOIN)
      const esc = likeEscape(tAuthor);
      // Using LOWER for case-insensitive match if DB collation is case-sensitive.
      conditions.push('(a.name LIKE ? ESCAPE \'\\\\\' OR b.title LIKE ? ESCAPE \'\\\\\')');
      // We include b.title LIKE as additional fallback because some data stores author under title in some cases.
      params.push(`%${esc}%`, `%${esc}%`);
    }

    if (tGenre.length > 0) {
      const esc = likeEscape(tGenre);
      // prefer b.genre
      conditions.push('b.genre LIKE ? ESCAPE \'\\\\\'');
      params.push(`%${esc}%`);
    }

    if (tPublisher.length > 0) {
      const esc = likeEscape(tPublisher);
      // match publisher name from publishers table alias 'p'
      conditions.push('p.name LIKE ? ESCAPE \'\\\\\'');
      params.push(`%${esc}%`);
    }

    const whereSQL = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return runQuery(whereSQL, params);
  }

  // --- Legacy q fallback logic (title-only behavior preserved) ---
  // 1) numeric q -> book_id exact
  if (/^\d+$/.test(tQ)) {
    const numericRows = await runQuery('WHERE b.book_id = ?', [Number(tQ)]);
    if (numericRows.length) return numericRows;
  }

  // 2) exact title (case-insensitive)
  const exactRows = await runQuery('WHERE LOWER(b.title) = ?', [tQ.toLowerCase()]);
  if (exactRows.length) return exactRows;

  // 3) fallback: title LIKE %q%
  if (tQ.length > 0) {
    const esc = likeEscape(tQ);
    const likeRows = await runQuery('WHERE b.title LIKE ? ESCAPE \'\\\\\'', [`%${esc}%`]);
    return likeRows;
  }

  // 4) No filters at all -> return paginated full list (reuse getAllBooks)
  return getAllBooks(db, { page: pageNum, pageSize: limit });
}

module.exports = {
  getAllBooks,
  getBookById,
  getAvailability,
  searchBooks,
};
