// src/middleware/db.middleware.js
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart_library',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  timezone: 'Z',     // send/receive in UTC
  dateStrings: true, // return DATETIME/TIMESTAMP as "YYYY-MM-DD HH:MM:SS"
});

// Ensure all sessions use UTC
db.query("SET time_zone = '+00:00'").catch(console.error);

// Safety: enforce UTC whenever a new connection is created
if (typeof db.on === 'function') {
  db.on('connection', (conn) => {
    conn.query("SET time_zone = '+00:00'").catch(() => {});
  });
}

module.exports = (req, res, next) => {
  req.db = db;
  next();
};
