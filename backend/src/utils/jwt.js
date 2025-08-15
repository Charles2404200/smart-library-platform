// src/utils/jwt.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function signUserToken(user, opts = {}) {
  const payload = { id: user.id, email: user.email, role: user.role };
  const options = { expiresIn: '1d', ...opts };
  return jwt.sign(payload, JWT_SECRET, options);
}

module.exports = { signUserToken };
