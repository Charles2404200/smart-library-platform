const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { URL } = require('url');

dotenv.config({ path: path.join(__dirname, '../.env') });

// Read ALL SQL files. Ensure these files do NOT contain the DELIMITER command.
const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
const dataSql = fs.readFileSync(path.join(__dirname, 'sample_data.sql'), 'utf8');
const proceduresSql = fs.readFileSync(path.join(__dirname, 'procedures.sql'), 'utf8');
const functionsSql = fs.readFileSync(path.join(__dirname, 'functions.sql'), 'utf8');
const triggersSql = fs.readFileSync(path.join(__dirname, 'functions_triggers.sql'), 'utf8');

const dbUrl = new URL(process.env.DATABASE_URL);

const connection = mysql.createConnection({
  host: dbUrl.hostname,
  port: dbUrl.port,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
  multipleStatements: true, // This option is crucial
});

console.log('🚀 Connecting to database and resetting...');

async function runQueries() {
  try {
    await connection.promise().query(schemaSql);
    console.log('✅ schema.sql executed.');

    await connection.promise().query(dataSql);
    console.log('✅ sample_data.sql executed.');

    // Execute the entire file content as one multi-statement query
    await connection.promise().query(proceduresSql);
    console.log('✅ procedures.sql executed.');

    await connection.promise().query(functionsSql);
    console.log('✅ functions.sql executed.');
    
    await connection.promise().query(triggersSql);
    console.log('✅ functions_triggers.sql executed.');

    console.log('🎉 Database is ready.');
  } catch (err) {
    console.error('❌ SQL Script Error:', err.sqlMessage || err.message);
    // Log the full error object for more details
    console.error(err);
  } finally {
    connection.end();
  }
}

runQueries();