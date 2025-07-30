const express = require('express');
const router = express.Router();
const { createSession } = require('../controllers/analytics.controller');

router.post('/reading-session', createSession);

module.exports = router;
