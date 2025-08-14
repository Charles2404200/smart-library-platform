// src/routes/admin.routes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/* -------------------- Auth: Staff/Admin only -------------------- */
function verifyStaffOrAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    if (decoded.role !== 'staff' && decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Staff/Admin only' });
    }
    next();
  } catch (err) {
    console.error('❌ Invalid token:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/* -------------------- Helpers: upsert by name -------------------- */
async function upsertPublisherByName(conn, name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;

  const [found] = await conn.query(
    'SELECT publisher_id FROM publishers WHERE name = ? LIMIT 1',
    [trimmed]
  );
  if (found.length) return found[0].publisher_id;

  // Create new id (no AUTO_INCREMENT in schema)
  const [maxRow] = await conn.query('SELECT COALESCE(MAX(publisher_id), 0) AS maxId FROM publishers');
  const newId = (maxRow[0]?.maxId || 0) + 1;

  await conn.query(
    'INSERT INTO publishers (publisher_id, name, address) VALUES (?, ?, NULL)',
    [newId, trimmed]
  );
  return newId;
}

async function upsertAuthorByName(conn, name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;

  const [found] = await conn.query(
    'SELECT author_id FROM authors WHERE name = ? LIMIT 1',
    [trimmed]
  );
  if (found.length) return found[0].author_id;

  const [maxRow] = await conn.query('SELECT COALESCE(MAX(author_id), 0) AS maxId FROM authors');
  const newId = (maxRow[0]?.maxId || 0) + 1;

  await conn.query(
    'INSERT INTO authors (author_id, name) VALUES (?, ?)',
    [newId, trimmed]
  );
  return newId;
}

/* -------------------- Multer: save images to backend/uploads -------------------- */
const uploadDir = path.join(__dirname, '../../uploads'); // from src/routes -> backend/uploads
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `book-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const fileFilter = (_req, file, cb) => {
  if (/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)) return cb(null, true);
  cb(new Error('Invalid image type'));
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

/* -------------------- List books (with image_url, authors, publishers) -------------------- */
router.get('/books', verifyStaffOrAdmin, async (req, res) => {
  const db = req.db;
  try {
    const [rows] = await db.query(`
      SELECT 
        b.book_id,
        b.title,
        b.genre,
        b.copies,
        b.available_copies,
        b.image_url,
        p.name AS primary_publisher,
        GROUP_CONCAT(DISTINCT p2.name ORDER BY p2.name SEPARATOR ', ') AS publishers,
        GROUP_CONCAT(DISTINCT a.name ORDER BY a.name SEPARATOR ', ') AS authors
      FROM books b
      LEFT JOIN publishers p ON b.publisher_id = p.publisher_id
      LEFT JOIN book_publishers bp ON b.book_id = bp.book_id
      LEFT JOIN publishers p2 ON bp.publisher_id = p2.publisher_id
      LEFT JOIN book_authors ba ON b.book_id = ba.book_id
      LEFT JOIN authors a ON ba.author_id = a.author_id
      GROUP BY b.book_id
      ORDER BY b.book_id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching books:', err);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

/* -------------------- For autocomplete: publishers & authors -------------------- */
router.get('/publishers', verifyStaffOrAdmin, async (req, res) => {
  const db = req.db;
  try {
    const [rows] = await db.query('SELECT publisher_id, name FROM publishers ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching publishers:', err);
    res.status(500).json({ error: 'Failed to fetch publishers' });
  }
});

router.get('/authors', verifyStaffOrAdmin, async (req, res) => {
  const db = req.db;
  try {
    const [rows] = await db.query('SELECT author_id, name FROM authors ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching authors:', err);
    res.status(500).json({ error: 'Failed to fetch authors' });
  }
});

/* -------------------- Add a book (multi authors & publishers by name) -------------------- */
/**
 * Body:
 * {
 *   book_id?: number,           // optional (if omitted -> max+1)
 *   title: string,
 *   genre: string,
 *   copies: number,
 *   publishers: string[] | "csv,of,names",
 *   authors:    string[] | "csv,of,names"
 * }
 */
router.post('/books', verifyStaffOrAdmin, async (req, res) => {
  const conn = await req.db.getConnection();
  try {
    let {
      book_id,
      title,
      genre,
      copies,
      publishers = [],
      authors = [],
    } = req.body;

    if (!title || !genre || copies == null) {
      return res.status(400).json({ error: 'Missing title, genre or copies' });
    }

    // Accept CSV
    if (typeof publishers === 'string') {
      publishers = publishers.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (typeof authors === 'string') {
      authors = authors.split(',').map(s => s.trim()).filter(Boolean);
    }

    await conn.beginTransaction();

    // assign id if not provided
    if (!book_id) {
      const [r] = await conn.query('SELECT COALESCE(MAX(book_id), 0) AS maxId FROM books');
      book_id = (r[0]?.maxId || 0) + 1;
    }

    // upsert publishers (first one becomes primary)
    const publisherIds = [];
    for (const name of publishers) {
      const pid = await upsertPublisherByName(conn, name);
      if (pid) publisherIds.push(pid);
    }
    const primaryPublisherId = publisherIds.length ? publisherIds[0] : null;

    // insert book
    await conn.query(
      `INSERT INTO books (book_id, title, genre, publisher_id, copies, available_copies)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [book_id, title, genre, primaryPublisherId, copies, copies]
    );

    // M2M publishers
    for (const pid of publisherIds) {
      await conn.query(
        'INSERT IGNORE INTO book_publishers (book_id, publisher_id) VALUES (?, ?)',
        [book_id, pid]
      );
    }

    // upsert authors + M2M
    for (const name of authors) {
      const aid = await upsertAuthorByName(conn, name);
      if (aid) {
        await conn.query(
          'INSERT IGNORE INTO book_authors (book_id, author_id) VALUES (?, ?)',
          [book_id, aid]
        );
      }
    }

    // ----- robust staff log (SP with fallback, 255-char cap) -----
    const authorsStr = Array.isArray(authors) ? authors.join(', ') : String(authors || '');
    const pubsStr    = Array.isArray(publishers) ? publishers.join(', ') : String(publishers || '');
    let action = `Added book #${book_id}: "${title}" (copies=${copies}) with authors=[${authorsStr}] publishers=[${pubsStr}]`;
    if (action.length > 255) action = action.slice(0, 252) + '...';

    try {
      await conn.query('CALL LogStaffAction(?, ?)', [req.user?.id || null, action]);
    } catch (logErr) {
      // fallback if SP missing/unavailable
      try {
        await conn.query(
          'INSERT INTO staff_log (staffId, action, createdAt) VALUES (?, ?, NOW())',
          [req.user?.id || null, action]
        );
      } catch (fallbackErr) {
        console.error('❌ Failed to write staff log:', fallbackErr.message);
      }
    }
    // -------------------------------------------------------------

    await conn.commit();
    res.status(201).json({ message: 'Book added', book_id });
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    console.error('❌ Error adding book:', err);
    res.status(500).json({ error: err.message || 'Failed to add book' });
  } finally {
    conn.release();
  }
});


/* -------------------- Update metadata (title/genre/primary publisher id) -------------------- */
router.put('/books/:id', verifyStaffOrAdmin, async (req, res) => {
  const db = req.db;
  const bookId = req.params.id;
  const { title, genre, publisher_id } = req.body;

  try {
    await db.execute(
      `UPDATE books SET title = ?, genre = ?, publisher_id = ? WHERE book_id = ?`,
      [title, genre, publisher_id || null, bookId]
    );

    await db.query('CALL LogStaffAction(?, ?)', [
      req.user.id,
      `Updated book meta: #${bookId} -> title=${title}, genre=${genre}, primary_publisher_id=${publisher_id || 'NULL'}`
    ]);

    res.json({ message: 'Book metadata updated' });
  } catch (err) {
    console.error('❌ Error updating book:', err);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

/* -------------------- Adjust total copies (keeps borrowed constant) -------------------- */
router.patch('/books/:id/copies', verifyStaffOrAdmin, async (req, res) => {
  const db = req.db;
  const bookId = parseInt(req.params.id, 10);
  const { copies } = req.body;

  if (Number.isNaN(bookId) || copies == null) {
    return res.status(400).json({ error: 'Missing or invalid book id / copies' });
  }

  try {
    const [resultSets] = await db.query('CALL UpdateBookInventory(?, ?)', [bookId, Number(copies)]);
    const rows = Array.isArray(resultSets) ? resultSets[0] : [];
    const payload = rows && rows[0] ? rows[0] : null;

    await db.query('CALL LogStaffAction(?, ?)', [
      req.user.id,
      `Adjusted total copies: #${bookId} -> ${copies}`
    ]);

    res.json({
      message: 'Inventory updated',
      updated: payload || { book_id: bookId, copies: Number(copies) }
    });
  } catch (err) {
    console.error('❌ Error adjusting copies:', err);
    res.status(500).json({ error: err.message || 'Failed to adjust copies' });
  }
});

/* -------------------- Adjust available copies (keeps borrowed constant) -------------------- */
router.patch('/books/:id/available', verifyStaffOrAdmin, async (req, res) => {
  const db = req.db;
  const bookId = Number(req.params.id);
  const { available } = req.body;

  if (!Number.isInteger(bookId) || available == null) {
    return res.status(400).json({ error: 'Missing or invalid book id / available' });
  }

  try {
    const [resultSets] = await db.query('CALL UpdateBookAvailable(?, ?)', [
      bookId,
      Number(available),
    ]);
    const payload =
      Array.isArray(resultSets) && Array.isArray(resultSets[0]) && resultSets[0][0]
        ? resultSets[0][0]
        : null;

    await db.query('CALL LogStaffAction(?, ?)', [
      req.user.id,
      `Adjusted available for book #${bookId} -> ${available}`,
    ]);

    res.json({ updated: payload });
  } catch (err) {
    console.error('❌ Update available error:', err);
    res.status(500).json({ error: err.message || 'Failed to update available copies' });
  }
});

/* -------------------- Upload/replace book image -------------------- */
router.post('/books/:id/image', verifyStaffOrAdmin, upload.single('image'), async (req, res) => {
  try {
    const db = req.db;
    const bookId = Number(req.params.id);
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const imageUrl = `/uploads/${req.file.filename}`; // served by index.js static

    await db.execute('UPDATE books SET image_url = ? WHERE book_id = ?', [imageUrl, bookId]);

    await db.query('CALL LogStaffAction(?, ?)', [
      req.user.id,
      `Updated image for book #${bookId} -> ${imageUrl}`,
    ]);

    res.json({ message: 'Image uploaded', image_url: imageUrl });
  } catch (err) {
    console.error('❌ Upload image error:', err);
    res.status(500).json({ error: err.message || 'Failed to upload image' });
  }
});

/* -------------------- Retire book -------------------- */
router.delete('/books/:id', verifyStaffOrAdmin, async (req, res) => {
  const db = req.db;
  const bookId = req.params.id;

  try {
    await db.execute('DELETE FROM books WHERE book_id = ?', [bookId]);

    await db.query('CALL LogStaffAction(?, ?)', [
      req.user.id,
      `Retired book #${bookId}`,
    ]);

    res.json({ message: 'Book retired' });
  } catch (err) {
    console.error('❌ Error retiring book:', err);
    res.status(500).json({ error: 'Failed to retire book' });
  }
});

// -------------------- Staff Logs --------------------
router.get('/logs', verifyStaffOrAdmin, async (req, res) => {
  const db = req.db;
  try {
    const [rows] = await db.query(`
      SELECT
        l.id,
        u.name AS staff_name,
        l.action,
        l.createdAt
      FROM staff_log l
      LEFT JOIN users u ON l.staffId = u.id
      ORDER BY l.createdAt DESC, l.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching logs:', err.message || err);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

module.exports = router;
