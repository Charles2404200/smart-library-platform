// src/controllers/auth.controller.js
const {
  getUserByEmail,
  createUser,
  emailExists,
  comparePassword,
  normalizeRole,
} = require('../services/auth.service');
const { signUserToken } = require('../utils/jwt');

// POST /api/auth/register
async function register(req, res) {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }

  const conn = await req.db.getConnection();
  try {
    const exists = await emailExists(conn, email);
    if (exists) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const user = await createUser(conn, { name, email, password, role: normalizeRole(role) });
    return res.status(201).json({ message: 'User registered successfully', user });
  } catch (err) {
    console.error('❌ Registration Error:', err);
    return res.status(500).json({ error: 'Internal server error during registration' });
  } finally {
    conn.release();
  }
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const conn = await req.db.getConnection();
  try {
    const user = await getUserByEmail(conn, email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await comparePassword(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signUserToken(user);
    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
      },
    });
  } catch (err) {
    console.error('❌ Login Error:', err);
    return res.status(500).json({ error: 'Internal server error during login' });
  } finally {
    conn.release();
  }
}

module.exports = { register, login };
