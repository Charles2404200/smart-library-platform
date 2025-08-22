// backend/src/controllers/search.controller.js
// Robust advanced search controller that builds an AND-based WHERE clause
// and attempts to be tolerant to different DB schemas (checks columns/tables existence).

const DEFAULT_PAGE_SIZE = 24;

async function columnsForTable(pool, tableName) {
  try {
    const [cols] = await pool.query(`SHOW COLUMNS FROM \`${tableName}\``);
    return cols.map((c) => c.Field);
  } catch (err) {
    // Table may not exist
    return [];
  }
}

async function tableExists(pool, tableName) {
  try {
    const [rows] = await pool.query(`SHOW TABLES LIKE ?`, [tableName]);
    return Array.isArray(rows) && rows.length > 0;
  } catch (err) {
    return false;
  }
}

module.exports.searchAdvanced = async function searchAdvanced(req, res) {
  const pool = req.db; // expects pool set by middleware in index.js
  if (!pool) {
    return res.status(500).json({ error: 'Database pool is not available on req.db' });
  }

  const {
    title = '',
    author = '',
    genre = '',
    publisher = '',
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  } = req.query || {};

  const pageNum = Math.max(1, parseInt(page || '1', 10));
  const limit = Math.max(1, parseInt(pageSize || String(DEFAULT_PAGE_SIZE), 10));
  const offset = (pageNum - 1) * limit;

  try {
    // Discover columns in books, and existence of authors/publishers join tables.
    const bookCols = await columnsForTable(pool, 'books');
    const hasAuthorCol = bookCols.includes('author') || bookCols.includes('author_name');
    const hasPublisherCol = bookCols.includes('publisher') || bookCols.includes('publisher_name');
    const hasGenreCol = bookCols.includes('genre');

    const authorsTableExists = await tableExists(pool, 'authors');
    const bookAuthorsExists = await tableExists(pool, 'book_authors');
    const publishersTableExists = await tableExists(pool, 'publishers');
    const bookPublishersExists = await tableExists(pool, 'book_publishers');

    // Build base SELECT (select columns from books; consumers expect common fields)
    let sql = `SELECT DISTINCT b.* FROM books b`;
    const params = [];
    const conditions = [];

    // If we need author/publisher joins later, add them by appending LEFT JOINs or using EXISTS subqueries
    if (!hasAuthorCol && authorsTableExists && bookAuthorsExists) {
      // We'll use an EXISTS subquery for author matching later
    }

    if (!hasPublisherCol && publishersTableExists && bookPublishersExists) {
      // same for publisher
    }

    // Title
    if (String(title || '').trim().length > 0) {
      if (hasAuthorCol && false) {
        // unreachable; left for example
      }
      if (bookCols.includes('title')) {
        conditions.push('b.title LIKE ?');
        params.push(`%${String(title).trim()}%`);
      }
    }

    // Author
    if (String(author || '').trim().length > 0) {
      if (hasAuthorCol) {
        conditions.push('(b.author LIKE ? OR b.author_name LIKE ?)');
        params.push(`%${String(author).trim()}%`, `%${String(author).trim()}%`);
      } else if (authorsTableExists && bookAuthorsExists) {
        conditions.push(`EXISTS (
          SELECT 1 FROM book_authors ba JOIN authors a ON a.id = ba.author_id
          WHERE ba.book_id = b.id AND a.name LIKE ?
        )`);
        params.push(`%${String(author).trim()}%`);
      } else {
        // fallback: search common combined columns if present
        if (bookCols.includes('authors')) {
          conditions.push('b.authors LIKE ?');
          params.push(`%${String(author).trim()}%`);
        }
      }
    }

    // Genre
    if (String(genre || '').trim().length > 0) {
      if (hasGenreCol) {
        conditions.push('b.genre LIKE ?');
        params.push(`%${String(genre).trim()}%`);
      } else {
        // fallback: try genre_id or tags column if present
        if (bookCols.includes('tags')) {
          conditions.push('b.tags LIKE ?');
          params.push(`%${String(genre).trim()}%`);
        }
      }
    }

    // Publisher
    if (String(publisher || '').trim().length > 0) {
      if (hasPublisherCol) {
        conditions.push('(b.publisher LIKE ? OR b.publisher_name LIKE ?)');
        params.push(`%${String(publisher).trim()}%`, `%${String(publisher).trim()}%`);
      } else if (publishersTableExists && bookPublishersExists) {
        conditions.push(`EXISTS (
          SELECT 1 FROM book_publishers bp JOIN publishers p ON p.id = bp.publisher_id
          WHERE bp.book_id = b.id AND p.name LIKE ?
        )`);
        params.push(`%${String(publisher).trim()}%`);
      } else {
        // fallback
        if (bookCols.includes('publisher')) {
          conditions.push('b.publisher LIKE ?');
          params.push(`%${String(publisher).trim()}%`);
        }
      }
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // pagination
    sql += ' ORDER BY b.id DESC';
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Run query
    const [rows] = await pool.query(sql, params);
    return res.json(rows || []);
  } catch (err) {
    console.error('searchAdvanced error:', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Search failed', message: err && err.message });
  }
};
