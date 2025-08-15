// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    console.warn('🚫 Bad Authorization header:', authHeader);
    return res.status(401).json({ error: 'No or bad Authorization header' });
  }

  // Normalize token: strip surrounding quotes if present
  let token = parts[1].trim();
  if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
    token = token.slice(1, -1);
  }

  // Optional: handle URL-encoded quotes %22edge case
  token = token.replace(/^%22|%22$/g, '');

  // Quick shape check: three base64url segments
  const looksJwt = /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(token);
  if (!looksJwt) {
    console.warn('🚫 Bad token format (first 12 chars):', token.slice(0, 12));
    return res.status(401).json({ error: 'Bad token format' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    console.error('❌ Invalid token (first 12 chars):', token.slice(0, 12), '-', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function verifyStaffOrAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'staff' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Access denied: Staff/Admin only' });
  }
  next();
}

module.exports = { authenticateJWT, verifyStaffOrAdmin };
