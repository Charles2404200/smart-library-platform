// src/routes/book.routes.js
const express = require('express');
const router = express.Router();

const BookController = require('../controllers/book.controller');

// GET /api/books
router.get('/', BookController.listBooks);

// GET /api/books/:bookId
router.get('/:bookId', BookController.getBook);

// GET /api/books/:bookId/availability
router.get('/:bookId/availability', BookController.checkAvailability);

module.exports = router;
