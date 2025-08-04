const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const registerUser = async (db, { name, email, password, role }) => {
  // Check if email already exists
  const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  if (existing.length > 0) throw new Error('Email already in use');

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Insert new user
  const [result] = await db.query(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name, email, hashedPassword, role]
  );

  return {
    id: result.insertId,
    name,
    email,
    role,
  };
};

const loginUser = async (db, { email, password }) => {
  // Fetch user
  const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  if (rows.length === 0) throw new Error('Invalid credentials');

  const user = rows[0];

  // Check password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('Invalid credentials');

  // Create token
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Return user info (without password)
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

module.exports = { registerUser, loginUser };
