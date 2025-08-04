const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { URL } = require('url');

// Load .env
dotenv.config({ path: path.join(__dirname, '../.env') });

// Read SQL files
const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
const dataSql = fs.readFileSync(path.join(__dirname, 'sample_data.sql'), 'utf8');

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
  multipleStatements: true
});

console.log('🚀 Connecting to database and resetting schema/data...');

connection.query(schemaSql, (err) => {
  if (err) {
    console.error('❌ Failed to run schema.sql');
    console.error(err);
    process.exit(1);
  }
  console.log('✅ schema.sql executed.');

  connection.query(dataSql, (err2) => {
    if (err2) {
      console.error('❌ Failed to run sample_data.sql');
      console.error(err2);
      process.exit(1);
    }
    console.log('✅ sample_data.sql executed.');
    console.log('🎉 Database is ready.');
    connection.end();
  });
});
