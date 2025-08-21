// backend/src/controllers/book.controller.js
const {
  getAllBooks,
  getBookById,
  getAvailability,
  searchBooks,
} = require('../services/book.service');

// Get list of all books
async function listBooks(req, res) {
  try {
    const rows = await getAllBooks(req.db, {
      page: req.query.page,
      pageSize: req.query.pageSize,
    });
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching books:', err);
    res.status(500).json({ error: 'Internal server error while fetching books' });
  }
}

// Get details of a single book by ID
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

// Check availability for a book
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

// Search books with filters, sorting, and pagination
async function searchBooksCtrl(req, res) {
  try {
    // Accept named filters (title, author, genre, publisher) + legacy q
    const {
      q = '',
      title = '',
      author = '',
      genre = '',
      publisher = '',
      minRating,
      page = 1,
      pageSize = 12,
      sort = 'relevance',
    } = req.query;

    const rows = await searchBooks(req.db, {
      // pass both named and legacy q — service will prefer named when present
      q: String(q || ''),
      title: (title || '').toString(),
      author: (author || '').toString(),
      genre: genre ? String(genre) : undefined,
      publisher: publisher ? String(publisher) : undefined,
      minRating: (minRating != null && minRating !== '') ? Number(minRating) : undefined,
      page: Number(page) || 1,
      pageSize: Math.min(50, Number(pageSize) || 12),
      sort: String(sort || 'relevance'),
    });

    res.json(rows);
  } catch (err) {
    console.error('❌ Error searching books:', err);
    res.status(500).json({ error: 'Internal server error while searching books' });
  }
}

module.exports = {
  listBooks,
  getBook,
  checkAvailability,
  searchBooks: searchBooksCtrl,
};
