const { MongoClient } = require('mongodb');

// Determine the Mongo URI (Atlas or local)
const EFFECTIVE_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/smart_library';

// Determine the database name
// If MONGO_DB is provided, use that, otherwise extract from URI path or default to "smart_library"
const EFFECTIVE_DB =
  process.env.MONGO_DB ||
  process.env.MONGODB_DB ||
  (() => {
    try {
      const parts = EFFECTIVE_URI.split('/');
      const lastSegment = parts[parts.length - 1].split('?')[0];
      return lastSegment || 'smart_library';
    } catch {
      return 'smart_library';
    }
  })();

let client;
let db;

/**
 * Get a connected MongoDB database instance
 */
async function getMongoDb() {
  if (db) return db;

  // Mask credentials in logs for safety
  const safeUri = EFFECTIVE_URI.replace(/\/\/([^@]+)@/, '//***:***@');
  console.log(`🧲 Analytics Mongo connecting to: ${safeUri} (DB: ${EFFECTIVE_DB})`);

  // Create the MongoDB client
  client = new MongoClient(EFFECTIVE_URI, {
    ignoreUndefined: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 4000, // 4s timeout for selection
  });

  // Connect to the cluster
  await client.connect();

  db = client.db(EFFECTIVE_DB);

  // Ensure the reading_sessions collection and indexes exist
  await ensureReadingSessionsSetup(db);

  console.log('✅ MongoDB Analytics connected');
  return db;
}

/**
 * Ensure reading_sessions collection exists with schema and indexes
 */
async function ensureReadingSessionsSetup(db) {
  const name = 'reading_sessions';
  const exists = await db.listCollections({ name }).toArray();

  if (!exists.length) {
    console.log('ℹ️ Creating "reading_sessions" collection with validator...');
    await db.createCollection(name, {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'bookId', 'startAt', 'device', 'pagesRead'],
          properties: {
            userId: { bsonType: ['int', 'long', 'string'] },
            bookId: { bsonType: ['int', 'long', 'string'] },
            startAt: { bsonType: 'date' },
            endAt: { bsonType: ['date', 'null'] },
            device: { bsonType: 'string' },
            pagesRead: { bsonType: 'array', items: { bsonType: 'int' } },
            highlights: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                required: ['page', 'text'],
                properties: {
                  page: { bsonType: 'int' },
                  text: { bsonType: 'string' },
                  color: { bsonType: ['string', 'null'] },
                },
              },
            },
            meta: { bsonType: 'object' },
          },
        },
      },
    });
  }

  const coll = db.collection(name);
  await coll.createIndexes([
    { key: { userId: 1, startAt: -1 }, name: 'ix_user_start' },
    { key: { bookId: 1, startAt: -1 }, name: 'ix_book_start' },
    { key: { startAt: -1 }, name: 'ix_start' },
    { key: { endAt: -1 }, name: 'ix_end' },
  ]);
}

module.exports = { getMongoDb };
