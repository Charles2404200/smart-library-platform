/* eslint-disable no-console */
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { URL } = require('url');

dotenv.config({ path: path.join(__dirname, '../.env') });

const RESET = process.argv.includes('--reset');

// --- Read SQL files ---
const schemaSql     = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
const dataSql       = fs.readFileSync(path.join(__dirname, 'sample_data.sql'), 'utf8');
const proceduresSql = fs.readFileSync(path.join(__dirname, 'procedures.sql'), 'utf8');

// --- DB connection info ---
const dbUrl  = new URL(process.env.DATABASE_URL);
const dbName = dbUrl.pathname.slice(1);

const connection = mysql.createConnection({
  host: dbUrl.hostname,
  port: dbUrl.port,
  user: dbUrl.username,
  password: dbUrl.password,
  ssl: { rejectUnauthorized: false },
  multipleStatements: true,
});

const exec = (sql, params = []) =>
  new Promise((resolve, reject) => {
    connection.query(sql, params, (e, rows) => (e ? reject(e) : resolve(rows)));
  });

function normalize(s) {
  return s.replace(/\r\n/g, '\n');
}

// Remove dangerous drops unless --reset, make CREATE TABLE idempotent,
// and strip any ALTER that adds books.image_url (we add it conditionally later).
function makeSchemaSafe(raw, allowDrops = false) {
  let text = normalize(raw);

  if (!allowDrops) {
    text = text.replace(/^[ \t]*DROP\s+TABLE\s+IF\s+EXISTS[\s\S]*?;[ \t]*$/gmi, '');
  }

  // CREATE TABLE → CREATE TABLE IF NOT EXISTS (only if missing)
  text = text.replace(
    /\bCREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)([`"]?\w+[`"]?)/gmi,
    'CREATE TABLE IF NOT EXISTS $1'
  );

  // Strip any ALTER that tries to add the image_url column (avoid duplicates)
  text = text.replace(
    /ALTER\s+TABLE\s+`?books`?[\s\S]*?ADD\s+COLUMN\s+`?image_url`?[\s\S]*?;[ \t]*/gmi,
    ''
  );

  return text;
}

// MySQL doesn’t support ADD COLUMN IF NOT EXISTS (older servers), so check first.
async function applySchemaPatches() {
  console.log('🩹 Applying schema patches…');

  // Ensure book_publishers exists (idempotent; harmless if already there)
  await exec(`
    CREATE TABLE IF NOT EXISTS book_publishers (
      book_id INT NOT NULL,
      publisher_id INT NOT NULL,
      PRIMARY KEY (book_id, publisher_id),
      CONSTRAINT fk_bp_book FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE,
      CONSTRAINT fk_bp_pub  FOREIGN KEY (publisher_id) REFERENCES publishers(publisher_id) ON DELETE CASCADE
    );
  `);

  // Conditionally add books.image_url
  const colCheck = await exec(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'books' AND COLUMN_NAME = 'image_url'`,
    [dbName]
  );
  if (!colCheck.length) {
    await exec(`ALTER TABLE books ADD COLUMN image_url VARCHAR(255) NULL`);
  }

  // Backfill primary publisher into M2M table (won’t duplicate because of PK)
  await exec(`
    INSERT IGNORE INTO book_publishers (book_id, publisher_id)
    SELECT b.book_id, b.publisher_id
    FROM books b
    WHERE b.publisher_id IS NOT NULL;
  `);

  console.log('✅ Patches applied.');
}

// Split procedures/functions/triggers into executable statements
function parseRoutineBlocks(raw) {
  let text = normalize(raw);
  text = text.replace(/DELIMITER\s+\S+/gmi, '');
  text = text.replace(/^[ \t]*--.*$/gm, '');

  const statements = [];
  const dropRegex   = /\bDROP\s+(?:PROCEDURE|FUNCTION|TRIGGER)\s+IF\s+EXISTS\s+[\w`]+;?/gim;
  const createRegex = /\bCREATE\s+(?:PROCEDURE|FUNCTION|TRIGGER)[\s\S]*?END\s*;/gim;

  let m;
  while ((m = dropRegex.exec(text)) !== null) {
    statements.push(m[0].trim().replace(/;?$/, ';'));
  }
  const blocks = text.match(createRegex);
  if (blocks) for (const b of blocks) statements.push(b.trim());
  return statements;
}

// Make seed inserts idempotent
function makeDataInsertsIdempotent(raw) {
  let text = normalize(raw);
  text = text.replace(/^[ \t]*TRUNCATE\s+TABLE[\s\S]*?;[ \t]*$/gmi, '');
  text = text.replace(/^[ \t]*DELETE\s+FROM[\s\S]*?;[ \t]*$/gmi, '');
  text = text.replace(/\bINSERT\s+INTO\b/gi, 'INSERT IGNORE INTO');
  return text;
}

(async () => {
  try {
    console.log(`🚀 Ensuring database '${dbName}' exists…`);
    await exec(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);

    connection.changeUser({ database: dbName }, async (err2) => {
      if (err2) {
        console.error(`❌ Failed to switch to database '${dbName}'`, err2);
        process.exit(1);
      }

      try {
        if (RESET) {
          console.log('⚠️  --reset detected: applying schema as-is (may drop & recreate)');
          await exec(normalize(schemaSql));
        } else {
          console.log('📜 Applying schema safely (no drops)…');
          const safeSchema = makeSchemaSafe(schemaSql, /* allowDrops */ false);
          await exec(safeSchema);
          await applySchemaPatches();
        }
        console.log('✅ Schema applied.');

        // Routines
        const routines = parseRoutineBlocks(proceduresSql);
        console.log(`🧩 Found ${routines.length} routine statements in procedures.sql`);
        for (const stmt of routines) {
          await exec(stmt);
        }
        console.log('✅ procedures.sql applied.');

        // Sample data
        console.log('🌱 Applying sample_data.sql idempotently…');
        const safeData = makeDataInsertsIdempotent(dataSql);
        await exec(safeData);
        console.log('✅ sample_data.sql applied.');

        console.log('🎉 Database is fully ready.');
        connection.end();
      } catch (e) {
        console.error('❌ Failed while applying SQL:', e);
        connection.end();
        process.exit(1);
      }
    });
  } catch (e) {
    console.error('❌ Setup error:', e);
    process.exit(1);
  }
})();
