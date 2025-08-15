// src/routes/review.routes.js
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../../middlewares/authMiddleware');
const ReviewController = require('../controllers/review.controller');

// Public: list reviews for a book + aggregates
router.get('/book/:bookId', ReviewController.listByBook);

// Auth: create/update a review (upsert by user+book)
router.post('/', authenticateJWT, ReviewController.upsert);

// (Optional) delete own review or staff/admin
router.delete('/:id', authenticateJWT, ReviewController.remove);

module.exports = router;
