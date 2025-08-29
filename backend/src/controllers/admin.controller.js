// src/controllers/admin.controller.js
const { upsertAuthorByName, upsertPublisherByName } = require('../services/admin.service');
const { writeStaffLog } = require('../utils/staffLog');

// -------- Books (list)
async function listBooks(req, res) {
  const db = req.db;
  try {
    const [rows] = await db.query(`
      SELECT 
        b.book_id, b.title, b.genre, b.copies, b.available_copies, b.image_url,
        b.retired, b.retired_at, b.retired_by, b.retired_reason,
        p.name AS primary_publisher,
        GROUP_CONCAT(DISTINCT p2.name ORDER BY p2.name SEPARATOR ', ') AS publishers,
        GROUP_CONCAT(DISTINCT a.name  ORDER BY a.name  SEPARATOR ', ') AS authors
      FROM books b
      LEFT JOIN publishers p   ON b.publisher_id = p.publisher_id
      LEFT JOIN book_publishers bp ON b.book_id = bp.book_id
      LEFT JOIN publishers p2  ON bp.publisher_id = p2.publisher_id
      LEFT JOIN book_authors ba ON b.book_id = ba.book_id
      LEFT JOIN authors a      ON ba.author_id = a.author_id
      GROUP BY b.book_id
      ORDER BY b.book_id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching books:', err);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
}

// -------- Lookups
async function listPublishers(req, res) {
  try {
    const [rows] = await req.db.query('SELECT publisher_id, name FROM publishers ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching publishers:', err);
    res.status(500).json({ error: 'Failed to fetch publishers' });
  }
}

async function listAuthors(req, res) {
  try {
    const [rows] = await req.db.query('SELECT author_id, name FROM authors ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching authors:', err);
    res.status(500).json({ error: 'Failed to fetch authors' });
  }
}

// -------- Create book (multi authors/pubs)
async function createBook(req, res) {
  const conn = await req.db.getConnection();
  try {
    let { book_id, title, genre, copies, publishers = [], authors = [] } = req.body;
    if (!title || !genre || copies == null) {
      return res.status(400).json({ error: 'Missing title, genre or copies' });
    }
    if (typeof publishers === 'string') publishers = publishers.split(',').map(s => s.trim()).filter(Boolean);
    if (typeof authors === 'string') authors = authors.split(',').map(s => s.trim()).filter(Boolean);

    await conn.beginTransaction();

    if (!book_id) {
      const [r] = await conn.query('SELECT COALESCE(MAX(book_id), 0) AS maxId FROM books');
      book_id = (r[0]?.maxId || 0) + 1;
    }

    const publisherIds = [];
    for (const name of publishers) {
      const pid = await upsertPublisherByName(conn, name);
      if (pid) publisherIds.push(pid);
    }
    const primaryPublisherId = publisherIds[0] ?? null;

    await conn.query(
      `INSERT INTO books (book_id, title, genre, publisher_id, copies, available_copies)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [book_id, title, genre, primaryPublisherId, copies, copies]
    );

    for (const pid of publisherIds) {
      await conn.query('INSERT IGNORE INTO book_publishers (book_id, publisher_id) VALUES (?, ?)', [book_id, pid]);
    }
    for (const name of authors) {
      const aid = await upsertAuthorByName(conn, name);
      if (aid) {
        await conn.query('INSERT IGNORE INTO book_authors (book_id, author_id) VALUES (?, ?)', [book_id, aid]);
      }
    }

    await writeStaffLog(conn, req.user?.id, `Added book #${book_id}: "${title}" (copies=${copies}) with authors=[${authors.join(', ')}] publishers=[${publishers.join(', ')}]`);
    await conn.commit();
    res.status(201).json({ message: 'Book added', book_id });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    console.error('❌ Error adding book:', err);
    res.status(500).json({ error: err.message || 'Failed to add book' });
  } finally {
    conn.release();
  }
}

// -------- Update book meta
async function updateBookMeta(req, res) {
  const db = req.db;
  const bookId = req.params.id;
  const { title, genre, publisher_id } = req.body;
  try {
    await db.execute(
      `UPDATE books SET title = ?, genre = ?, publisher_id = ? WHERE book_id = ?`,
      [title, genre, publisher_id || null, bookId]
    );
    await writeStaffLog(db, req.user?.id, `Updated book meta: #${bookId} -> title=${title}, genre=${genre}, primary_publisher_id=${publisher_id || 'NULL'}`);
    res.json({ message: 'Book metadata updated' });
  } catch (err) {
    console.error('❌ Error updating book:', err);
    res.status(500).json({ error: 'Failed to update book' });
  }
}

// -------- Adjust total copies
async function adjustCopies(req, res) {
  const db = req.db;
  const bookId = parseInt(req.params.id, 10);
  const { copies } = req.body;
  if (Number.isNaN(bookId) || copies == null) {
    return res.status(400).json({ error: 'Missing or invalid book id / copies' });
  }
  try {
    const [rs] = await db.query('CALL UpdateBookInventory(?, ?)', [bookId, Number(copies)]);
    const rows = Array.isArray(rs) ? rs[0] : [];
    const payload = rows && rows[0] ? rows[0] : null;

    await writeStaffLog(db, req.user?.id, `Adjusted total copies: #${bookId} -> ${copies}`);

    res.json({ message: 'Inventory updated', updated: payload || { book_id: bookId, copies: Number(copies) } });
  } catch (err) {
    console.error('❌ Error adjusting copies:', err);
    res.status(500).json({ error: err.message || 'Failed to adjust copies' });
  }
}

// -------- Adjust available
async function adjustAvailable(req, res) {
  const db = req.db;
  const bookId = Number(req.params.id);
  const { available } = req.body;
  if (!Number.isInteger(bookId) || available == null) {
    return res.status(400).json({ error: 'Missing or invalid book id / available' });
  }
  try {
    const [rs] = await db.query('CALL UpdateBookAvailable(?, ?)', [bookId, Number(available)]);
    const payload = Array.isArray(rs) && Array.isArray(rs[0]) && rs[0][0] ? rs[0][0] : null;

    await writeStaffLog(db, req.user?.id, `Adjusted available for book #${bookId} -> ${available}`);

    res.json({ updated: payload });
  } catch (err) {
    console.error('❌ Update available error:', err);
    res.status(500).json({ error: err.message || 'Failed to update available copies' });
  }
}

// -------- Upload image
// inside backend/src/controllers/admin.controller.js

async function uploadImage(req, res) {
  try {
    const db = req.db;
    const bookId = Number(req.params.id);

    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    // Our storage now saves in /uploads/books
    const imageUrl = `/uploads/books/${req.file.filename}`;

    await db.execute(
      'UPDATE books SET image_url = ? WHERE book_id = ?',
      [imageUrl, bookId]
    );

    await writeStaffLog(
      db,
      req.user?.id,
      `Updated image for book #${bookId} -> ${imageUrl}`
    );

    res.json({ message: 'Image uploaded', image_url: imageUrl });
  } catch (err) {
    console.error('❌ Upload image error:', err);
    res.status(500).json({ error: err.message || 'Failed to upload image' });
  }
}


// -------- Delete book
async function deleteBook(req, res) {
  const db = req.db;
  const bookId = req.params.id;
  try {
    await db.execute('DELETE FROM books WHERE book_id = ?', [bookId]);
    await writeStaffLog(db, req.user?.id, `Retired book #${bookId}`);
    res.json({ message: 'Book retired' });
  } catch (err) {
    console.error('❌ Error retiring book:', err);
    res.status(500).json({ error: 'Failed to retire book' });
  }
}

// -------- Logs
async function listLogs(req, res) {
  try {
    const [rows] = await req.db.query(`
      SELECT l.id, u.name AS staff_name, l.action, l.createdAt
      FROM staff_log l
      LEFT JOIN users u ON l.staffId = u.id
      ORDER BY l.createdAt DESC, l.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching logs:', err);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
}

// -------- Users (admin/staff view)
async function listUsers(req, res) {
  try {
    const [rows] = await req.db.query('SELECT id, name, email, role FROM users ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

async function changeUserRole(req, res) {
  const db = req.db;
  const { id } = req.params;
  const { role } = req.body;
  const allowed = new Set(['reader', 'staff', 'admin']);
  if (!allowed.has(role)) return res.status(400).json({ error: 'Invalid role. Use reader/staff/admin' });

  try {
    const [result] = await db.execute('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });

    await writeStaffLog(db, req.user?.id, `Changed role for user #${id} -> ${role}`);
    res.json({ id: Number(id), role });
  } catch (err) {
    console.error('❌ Update role error:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
}

// ---- Retire / Unretire book (admin only) ----
async function retireBook(req, res) {
  const db = req.db;
  const bookId = Number(req.params.id);
  const staffId = req.user?.id || null;
  const { reason = '' } = req.body || {};

  if (!Number.isInteger(bookId)) return res.status(400).json({ error: 'Invalid book id' });
  if (!staffId) return res.status(403).json({ error: 'Auth required' });
  if (!['admin'].includes(req.user?.role)) return res.status(403).json({ error: 'Only admin can retire books' });

  try {
    const [rs] = await db.query('CALL RetireBook(?, ?, ?)', [bookId, staffId, String(reason)]);
    const payload = Array.isArray(rs) && Array.isArray(rs[0]) && rs[0][0] ? rs[0][0] : null;
    return res.json({ message: 'Book retired', ...(payload || { book_id: bookId, retired: 1 }) });
  } catch (err) {
    console.error('❌ Retire book error:', err);
    return res.status(500).json({ error: err.message || 'Failed to retire book' });
  }
}

async function unretireBook(req, res) {
  const db = req.db;
  const bookId = Number(req.params.id);
  const staffId = req.user?.id || null;

  if (!Number.isInteger(bookId)) return res.status(400).json({ error: 'Invalid book id' });
  if (!staffId) return res.status(403).json({ error: 'Auth required' });
  if (!['admin'].includes(req.user?.role)) return res.status(403).json({ error: 'Only admin can unretire books' });

  try {
    const [rs] = await db.query('CALL UnretireBook(?, ?)', [bookId, staffId]);
    const payload = Array.isArray(rs) && Array.isArray(rs[0]) && rs[0][0] ? rs[0][0] : null;
    return res.json({ message: 'Book unretired', ...(payload || { book_id: bookId, retired: 0 }) });
  } catch (err) {
    console.error('❌ Unretire book error:', err);
    return res.status(500).json({ error: err.message || 'Failed to unretire book' });
  }
}
// -------- Reports (admin) --------
/**
 * GET /api/admin/reports/most-borrowed?start=YYYY-MM-DD&end=YYYY-MM-DD&limit=N
 */
async function mostBorrowedReport(req, res) {
  const db = req.db;
  const { start, end, limit } = req.query;
  const lim = Number(limit) || 10;
  try {
    let where = '1=1';
    const params = [];
    if (start) { where += ' AND c.checkoutAt >= ?'; params.push(start); }
    if (end)   { where += ' AND c.checkoutAt <= ?'; params.push(end); }
    params.push(lim);
    const [rows] = await db.query(
      `SELECT b.book_id, b.title, COUNT(c.id) AS borrow_count
       FROM checkout c
       JOIN books b ON c.bookId = b.book_id
       WHERE ${where}
       GROUP BY c.bookId
       ORDER BY borrow_count DESC
       LIMIT ?`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ Report (most-borrowed) error:', err);
    res.status(500).json({ error: 'Failed to generate most-borrowed report' });
  }
}

/**
 * GET /api/admin/reports/top-readers?start=&end=&limit=
 */
async function topReadersReport(req, res) {
  const db = req.db;
  const { start, end, limit } = req.query;
  const lim = Number(limit) || 10;
  try {
    let where = '1=1';
    const params = [];
    if (start) { where += ' AND c.checkoutAt >= ?'; params.push(start); }
    if (end)   { where += ' AND c.checkoutAt <= ?'; params.push(end); }
    params.push(lim);
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, COUNT(c.id) AS checkouts
       FROM checkout c
       JOIN users u ON c.userId = u.id
       WHERE ${where}
       GROUP BY u.id
       ORDER BY checkouts DESC
       LIMIT ?`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ Report (top-readers) error:', err);
    res.status(500).json({ error: 'Failed to generate top-readers report' });
  }
}

/**
 * GET /api/admin/reports/low-availability?threshold=NUMBER
 */
async function lowAvailabilityReport(req, res) {
  const db = req.db;
  const { threshold } = req.query;
  const thr = Number(threshold) || 5;
  try {
    const [rows] = await db.query(
      `SELECT book_id, title, copies, available_copies
       FROM books
       WHERE available_copies <= ?
       ORDER BY available_copies ASC`,
      [thr]
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ Report (low-availability) error:', err);
    res.status(500).json({ error: 'Failed to generate low-availability report' });
  }
}



  module.exports = {
  listBooks,
  listPublishers,
  listAuthors,
  createBook,
  updateBookMeta,
  adjustCopies,
  adjustAvailable,
  uploadImage,
  deleteBook,
  listLogs,
  listUsers,
  changeUserRole,
  retireBook,
  unretireBook,
  mostBorrowedReport,
  topReadersReport,
  lowAvailabilityReport,
};


