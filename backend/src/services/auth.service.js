// src/services/auth.service.js
const bcrypt = require('bcryptjs');

/** Whitelist vai trò hợp lệ */
const ALLOWED_ROLES = new Set(['reader', 'staff', 'admin']);

function normalizeRole(role) {
  const r = String(role || '').toLowerCase();
  return ALLOWED_ROLES.has(r) ? r : 'reader';
}

async function getUserByEmail(conn, email) {
  const [rows] = await conn.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
}

async function createUser(conn, { name, email, password, role = 'reader' }) {
  const hashed = await bcrypt.hash(password, 10);
  const safeRole = normalizeRole(role);

  const [result] = await conn.query(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name, email, hashed, safeRole]
  );

  return {
    id: result.insertId,
    name,
    email,
    role: safeRole,
  };
}

async function emailExists(conn, email) {
  const [rows] = await conn.query('SELECT 1 FROM users WHERE email = ? LIMIT 1', [email]);
  return rows.length > 0;
}

async function comparePassword(plain, hashed) {
  return bcrypt.compare(plain, hashed);
}

module.exports = {
  getUserByEmail,
  createUser,
  emailExists,
  comparePassword,
  normalizeRole,
  ALLOWED_ROLES,
};
