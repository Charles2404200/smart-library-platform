// src/routes/search.routes.js
const express = require('express');
const router = express.Router();
const { searchBooks } = require('../controllers/search.controller');

// Public search – available for any logged-in reader/staff
router.get('/books', searchBooks);

module.exports = router;
