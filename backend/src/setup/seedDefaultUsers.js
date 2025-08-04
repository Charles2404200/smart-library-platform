const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  STAFF_EMAIL,
  STAFF_PASSWORD,
  DATABASE_URL,
} = process.env;

async function seedDefaultUsers() {
  const conn = await mysql.createConnection(DATABASE_URL);

  const users = [
    {
      name: 'Admin User',
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: 'admin',
    },
    {
      name: 'Staff User',
      email: STAFF_EMAIL,
      password: STAFF_PASSWORD,
      role: 'staff',
    },
  ];

  for (const user of users) {
    const [rows] = await conn.query('SELECT * FROM users WHERE email = ?', [user.email]);
    if (rows.length === 0) {
      const hashed = await bcrypt.hash(user.password, 10);
      await conn.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [user.name, user.email, hashed, user.role]
      );
      console.log(`✅ Inserted ${user.role}: ${user.email}`);
    } else {
      console.log(`ℹ️  ${user.role} already exists: ${user.email}`);
    }
  }

  await conn.end();
}

seedDefaultUsers().catch(console.error);
