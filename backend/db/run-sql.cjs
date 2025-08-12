const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { URL } = require('url');

dotenv.config({ path: path.join(__dirname, '../.env') });

// Read SQL files
const schemaSql     = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
const dataSql       = fs.readFileSync(path.join(__dirname, 'sample_data.sql'), 'utf8');
const proceduresSql = fs.readFileSync(path.join(__dirname, 'procedures.sql'), 'utf8');

// Parse connection info
const dbUrl  = new URL(process.env.DATABASE_URL);
const dbName = dbUrl.pathname.slice(1);

// Create connection (no DB first)
const connection = mysql.createConnection({
  host: dbUrl.hostname,
  port: dbUrl.port,
  user: dbUrl.username,
  password: dbUrl.password,
  ssl: { rejectUnauthorized: false },
  multipleStatements: true
});

console.log(`🚀 Ensuring database '${dbName}' exists...`);
connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``, (err) => {
  if (err) {
    console.error(`❌ Failed to create database '${dbName}'`, err);
    process.exit(1);
  }
  console.log(`✅ Database '${dbName}' ready.`);

  connection.changeUser({ database: dbName }, (err2) => {
    if (err2) {
      console.error(`❌ Failed to switch to database '${dbName}'`, err2);
      process.exit(1);
    }

    // helper to exec one statement
    const execOne = (sql) =>
      new Promise((resolve, reject) => connection.query(sql, (e) => (e ? reject(e) : resolve())));

    // Split procedures.sql into individual statements:
    // - Remove any DELIMITER
    // - Grab each DROP ... ; and each CREATE ... END; block
    function parseRoutineBlocks(raw) {
      let text = raw.replace(/\r\n/g, '\n');
      text = text.replace(/DELIMITER\s+\S+/gmi, '');
      // keep block comments; strip line comments
      text = text.replace(/^[ \t]*--.*$/gm, '');

      const statements = [];
      const dropRegex   = /\bDROP\s+(?:PROCEDURE|FUNCTION|TRIGGER)\s+IF\s+EXISTS\s+[\w`]+;?/gim;
      const createRegex = /\bCREATE\s+(?:PROCEDURE|FUNCTION|TRIGGER)[\s\S]*?END\s*;/gim;
      let m;
      while ((m = dropRegex.exec(text)) !== null) statements.push(m[0].trim().replace(/;?$/, ';'));
      const blocks = text.match(createRegex);
      if (blocks) for (const b of blocks) statements.push(b.trim());
      return statements;
    }

    (async () => {
      try {
        console.log('📜 Running schema.sql...');
        await execOne(schemaSql);
        console.log('✅ schema.sql executed.');

        // Procedures BEFORE sample data is fine either way
        const procStatements = parseRoutineBlocks(proceduresSql);
        console.log(`🧩 Found ${procStatements.length} routine statements in procedures.sql`);
        for (const stmt of procStatements) {
          await execOne(stmt);
        }
        console.log('✅ procedures.sql executed.');

        console.log('📜 Running sample_data.sql...');
        await execOne(dataSql);
        console.log('✅ sample_data.sql executed.');
        console.log('🎉 Database is fully ready.');
      } catch (e) {
        console.error('❌ Failed while applying SQL:', e);
        process.exit(1);
      } finally {
        connection.end();
      }
    })();
  });
});
