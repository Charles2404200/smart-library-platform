// src/routes/borrow.routes.js
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../../middlewares/authMiddleware');
const BorrowController = require('../controllers/borrow.controller');

// POST /api/borrow/borrow
router.post('/borrow', authenticateJWT, BorrowController.borrowBook);

// POST /api/borrow/return
router.post('/return', authenticateJWT, BorrowController.returnBook);

// GET /api/borrow/my-borrows
router.get('/my-borrows', authenticateJWT, BorrowController.getMyBorrows);

module.exports = router;
