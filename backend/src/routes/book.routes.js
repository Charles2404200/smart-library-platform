// src/routes/book.routes.js
const express = require('express');
const router = express.Router();

const BookController = require('../controllers/book.controller');

// Search route first so it doesn't get caught by :bookId
router.get('/search/all', BookController.searchBooks);

// List all books
router.get('/', BookController.listBooks);

// Get a single book
router.get('/:bookId', BookController.getBook);

// Check availability
router.get('/:bookId/availability', BookController.checkAvailability);

module.exports = router;
