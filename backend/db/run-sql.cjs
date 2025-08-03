const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { URL } = require('url');

// Load .env
dotenv.config({ path: path.join(__dirname, '../.env') });

// Read SQL file
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

// Parse connection info
const dbUrl = new URL(process.env.DATABASE_URL);

const connection = mysql.createConnection({
  host: dbUrl.hostname,
  port: dbUrl.port,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl: {
    rejectUnauthorized: false
  },
  multipleStatements: true // <== FIX HERE ✅
});

// Execute SQL schema
connection.query(schema, (err, results) => {
  if (err) throw err;
  console.log('✅ Schema executed successfully.');
  connection.end();
});
