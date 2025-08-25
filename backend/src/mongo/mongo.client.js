const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const MONGO_DB  = process.env.MONGO_DB  || 'smart_library';

let client, db;

async function getMongoDb() {
  if (db) return db;
  client = new MongoClient(MONGO_URI, { ignoreUndefined: true });
  await client.connect();
  db = client.db(MONGO_DB);
  await ensureReadingSessionsSetup(db);
  return db;
}

async function ensureReadingSessionsSetup(db) {
  const name = 'reading_sessions';
  const exists = await db.listCollections({ name }).toArray();
  if (!exists.length) {
    await db.createCollection(name, {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'bookId', 'startAt', 'device', 'pagesRead'],
          properties: {
            userId: { bsonType: ['int','long','string'] },
            bookId: { bsonType: ['int','long','string'] },
            startAt: { bsonType: 'date' },
            endAt: { bsonType: ['date','null'] },
            device: { bsonType: 'string' },
            pagesRead: { bsonType: 'array', items: { bsonType: 'int' } },
            highlights: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                required: ['page','text'],
                properties: { page: { bsonType: 'int' }, text: { bsonType: 'string' }, color: { bsonType: ['string','null'] } }
              }
            },
            meta: { bsonType: 'object' }
          }
        }
      }
    });
  }
  const coll = db.collection(name);
  await coll.createIndexes([
    { key: { userId: 1, startAt: -1 }, name: 'ix_user_start' },
    { key: { bookId: 1, startAt: -1 }, name: 'ix_book_start' },
    { key: { startAt: -1 }, name: 'ix_start' },
  ]);
}

module.exports = { getMongoDb };
