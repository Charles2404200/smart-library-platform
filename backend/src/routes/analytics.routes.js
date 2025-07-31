const express = require('express');
const router = express.Router();

// Test route
router.get('/', (req, res) => {
  res.send('🔍 Analytics route working');
});

module.exports = router;
