// src/routes/user.routes.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: '👤 Users route is live!' });
});

module.exports = router;
