const express = require('express');
const router = express.Router();

// Add a new book
router.post('/add', async (req, res) => {
  const { title, genre, publisher, copies } = req.body;
  const db = req.db;

  try {
    const [result] = await db.execute(
      `INSERT INTO Book (title, genre, publisher, copies) VALUES (?, ?, ?, ?)`,
      [title, genre, publisher, copies]
    );

    // Log action
    await db.execute(`INSERT INTO StaffLog (staffId, action) VALUES (?, ?)`, [
      req.user.id,
      `Added new book: ${title}`
    ]);

    res.status(201).json({ message: 'Book added', bookId: result.insertId });
  } catch (err) {
    console.error('❌ Error adding book:', err);
    res.status(500).json({ error: 'Failed to add book' });
  }
});

// Update inventory
router.put('/update/:id', async (req, res) => {
  const { title, genre, publisher, copies } = req.body;
  const bookId = req.params.id;
  const db = req.db;

  try {
    await db.execute(
      `UPDATE Book SET title = ?, genre = ?, publisher = ?, copies = ? WHERE id = ?`,
      [title, genre, publisher, copies, bookId]
    );

    await db.execute(`INSERT INTO StaffLog (staffId, action) VALUES (?, ?)`, [
      req.user.id,
      `Updated book inventory: ID ${bookId}`
    ]);

    res.json({ message: 'Book updated' });
  } catch (err) {
    console.error('❌ Error updating book:', err);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

// Retire book
router.delete('/retire/:id', async (req, res) => {
  const bookId = req.params.id;
  const db = req.db;

  try {
    await db.execute(`DELETE FROM Book WHERE id = ?`, [bookId]);

    await db.execute(`INSERT INTO StaffLog (staffId, action) VALUES (?, ?)`, [
      req.user.id,
      `Retired book ID: ${bookId}`
    ]);

    res.json({ message: 'Book retired' });
  } catch (err) {
    console.error('❌ Error retiring book:', err);
    res.status(500).json({ error: 'Failed to retire book' });
  }
});

module.exports = router;
