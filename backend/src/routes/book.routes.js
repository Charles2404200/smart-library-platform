// routes/book.routes.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * GET /api/books
 * Fetch all books with author names
 */
router.get('/', async (req, res) => {
  try {
    const books = await prisma.book.findMany({
      include: {
        authors: {
          include: {
            author: true,
          },
        },
      },
    });

    const formatted = books.map((book) => ({
      id: book.id,
      title: book.title,
      genre: book.genre,
      publisher: book.publisher,
      copies: book.copies,
      authors: book.authors.map((ba) => ba.author.name).join(', '),
    }));

    res.json(formatted);
  } catch (err) {
    console.error('❌ Error fetching books:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/books/:bookId/availability
 * Check if a specific book is available
 */
router.get('/:bookId/availability', async (req, res) => {
  const { bookId } = req.params;
  try {
    const book = await prisma.book.findUnique({
      where: { id: parseInt(bookId) },
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const isAvailable = book.copies > 0;
    res.json({ available: isAvailable, copies: book.copies });
  } catch (err) {
    console.error('❌ Error checking availability:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
