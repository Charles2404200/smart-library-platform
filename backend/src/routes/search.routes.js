// backend/src/routes/search.routes.js
const express = require('express');
const router = express.Router();
const { searchAdvanced } = require('../controllers/search.controller');

router.get('/advanced', searchAdvanced);

module.exports = router;
