const express = require('express');
const { authenticateJWT } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/reports/avg-session-time', authenticateJWT, (_req, res) => {
  res.json({ avgSessionTime: 0 });
});

module.exports = router;
