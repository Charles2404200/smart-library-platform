// src/controllers/book.controller.js
const {
  getAllBooks,
  getBookById,
  getAvailability,
} = require('../services/book.service');

async function listBooks(req, res) {
  try {
    const rows = await getAllBooks(req.db);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching books:', err);
    res.status(500).json({ error: 'Internal server error while fetching books' });
  }
}

async function getBook(req, res) {
  const { bookId } = req.params;
  try {
    const row = await getBookById(req.db, bookId);
    if (!row) return res.status(404).json({ error: 'Book not found' });
    res.json(row);
  } catch (err) {
    console.error('❌ Error fetching book:', err);
    res.status(500).json({ error: 'Internal server error while fetching book' });
  }
}

async function checkAvailability(req, res) {
  const { bookId } = req.params;
  try {
    const info = await getAvailability(req.db, bookId);
    if (!info) return res.status(404).json({ error: 'Book not found' });
    res.json(info);
  } catch (err) {
    console.error('❌ Error checking availability:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  listBooks,
  getBook,
  checkAvailability,
};
