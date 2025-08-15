// src/routes/debug.routes.js
const express = require('express');
const { authenticateJWT } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/whoami', authenticateJWT, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
