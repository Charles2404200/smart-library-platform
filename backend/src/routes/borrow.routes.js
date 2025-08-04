// routes/borrow.routes.js
const express = require('express');
const router = express.Router();
const { borrowBook } = require('../controllers/borrow.controller');

router.post('/borrow', borrowBook);

module.exports = router;
