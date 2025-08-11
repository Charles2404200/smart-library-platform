const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// -------------------- Middleware: Verify Staff/Admin --------------------
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

// -------------------- Add a New Book --------------------
router.post('/add', verifyStaffOrAdmin, async (req, res) => {
  const { title, genre, publisher, copies } = req.body;
  const db = req.db;

  try {
    const [result] = await db.execute(
      `INSERT INTO books (title, genre, publisher_id, copies, available_copies)
       VALUES (?, ?, ?, ?, ?)`,
      [title, genre, publisher, copies, copies]
    );

    // Log action
    await db.execute(`INSERT INTO staff_log (staffId, action) VALUES (?, ?)`, [
      req.user.id,
      `Added new book: ${title}`
    ]);

    res.status(201).json({ message: 'Book added', bookId: result.insertId });
  } catch (err) {
    console.error('❌ Error adding book:', err);
    res.status(500).json({ error: 'Failed to add book' });
  }
});

// -------------------- Update Book --------------------
router.put('/update/:id', verifyStaffOrAdmin, async (req, res) => {
  const { title, genre, publisher, copies } = req.body;
  const bookId = req.params.id;
  const db = req.db;

  try {
    await db.execute(
      `UPDATE books 
       SET title = ?, genre = ?, publisher_id = ?, copies = ?, available_copies = ? 
       WHERE book_id = ?`,
      [title, genre, publisher, copies, copies, bookId]
    );

    await db.execute(`INSERT INTO staff_log (staffId, action) VALUES (?, ?)`, [
      req.user.id,
      `Updated book inventory: ID ${bookId}`
    ]);

    res.json({ message: 'Book updated' });
  } catch (err) {
    console.error('❌ Error updating book:', err);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

// -------------------- Retire Book --------------------
router.delete('/retire/:id', verifyStaffOrAdmin, async (req, res) => {
  const bookId = req.params.id;
  const db = req.db;

  try {
    await db.execute(`DELETE FROM books WHERE book_id = ?`, [bookId]);

    await db.execute(`INSERT INTO staff_log (staffId, action) VALUES (?, ?)`, [
      req.user.id,
      `Retired book ID: ${bookId}`
    ]);

    res.json({ message: 'Book retired' });
  } catch (err) {
    console.error('❌ Error retiring book:', err);
    res.status(500).json({ error: 'Failed to retire book' });
  }
});

// -------------------- Fetch All Books --------------------
router.get('/books', verifyStaffOrAdmin, async (req, res) => {
  const db = req.db;
  try {
    const [books] = await db.query(`
      SELECT b.book_id, b.title, b.genre, p.name AS publisher, b.copies, b.available_copies
      FROM books b
      LEFT JOIN publishers p ON b.publisher_id = p.publisher_id
      ORDER BY b.book_id DESC
    `);
    res.json(books);
  } catch (err) {
    console.error('❌ Error fetching books:', err);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// -------------------- View Staff Logs --------------------
router.get('/logs', verifyStaffOrAdmin, async (req, res) => {
  const db = req.db;
  try {
    const [logs] = await db.query(`
      SELECT l.id, u.name AS staff_name, l.action, l.createdAt
      FROM staff_log l
      LEFT JOIN users u ON l.staffId = u.id
      ORDER BY l.createdAt DESC
    `);
    res.json(logs);
  } catch (err) {
    console.error('❌ Error fetching logs:', err);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// -------------------- Top Borrowed Books --------------------
router.get('/top-borrowed', verifyStaffOrAdmin, async (req, res) => {
  const db = req.db;
  try {
    const [rows] = await db.query(`
      SELECT b.title, COUNT(c.id) AS borrow_count
      FROM checkout c
      JOIN books b ON c.bookId = b.book_id
      GROUP BY c.bookId
      ORDER BY borrow_count DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching top borrowed books:', err);
    res.status(500).json({ error: 'Failed to fetch top borrowed books' });
  }
});

module.exports = router;
