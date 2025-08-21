const bcrypt = require('bcryptjs');


async function getUserById(conn, userId) {
  const [rows] = await conn.query(
    'SELECT id, name, email, role, avatar_url FROM users WHERE id = ?',
    [userId]
  );
  return rows[0] || null;
}


async function getUserPasswordHash(conn, userId) {
  const [rows] = await conn.query('SELECT password FROM users WHERE id = ?', [userId]);
  return rows[0]?.password || null;
}


async function updateUserName(conn, userId, newName) {
  await conn.query(
    'UPDATE users SET name = ? WHERE id = ?',
    [newName, userId]
  );
}

async function updateUserPassword(conn, userId, newPassword) {
  const hashed = await bcrypt.hash(newPassword, 10);
  await conn.query('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);
}


async function updateUserAvatar(conn, userId, avatarUrl) {
  await conn.query(
    'UPDATE users SET avatar_url = ? WHERE id = ?',
    [avatarUrl, userId]
  );
}

module.exports = {
  getUserById,
  getUserPasswordHash,
  updateUserName,
  updateUserPassword,
  updateUserAvatar,
};