// scripts/seed-mongo.js
// Direct MongoDB seeder. Use only if you are comfortable writing directly to DB.
// Uses MONGODB_URI from .env by default.
// Install: npm install --save-dev mongodb @faker-js/faker dotenv
//
// Usage:
//    node scripts/seed-mongo.js --books 500 --users 50
// Or rely on .env: MONGODB_URI in your .env will be loaded.

require('dotenv').config();
const { MongoClient } = require('mongodb');
const { faker } = require('@faker-js/faker');

function parseArgs() {
  const argv = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}
const ARGS = parseArgs();

const MONGO_URI = process.env.MONGODB_URI || ARGS.mongo || process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = ARGS.db || process.env.SEED_DB || 'testdb';
const BOOKS = parseInt(ARGS.books || process.env.SEED_BOOKS || '100', 10);
const USERS = parseInt(ARGS.users || process.env.SEED_USERS || '10', 10);

async function run() {
  console.log('Connecting to', MONGO_URI, 'db:', DB_NAME);
  const client = new MongoClient(MONGO_URI, { useUnifiedTopology: true });
  await client.connect();
  const db = client.db(DB_NAME);

  const booksColl = db.collection('books');
  const usersColl = db.collection('users');

  const bookDocs = [];
  for (let i = 0; i < BOOKS; i++) {
    const copies = faker.datatype.number({ min: 0, max: 12 });
    bookDocs.push({
      title: faker.lorem.words({ min: 2, max: 6 }),
      authors: [faker.name.findName()],
      description: faker.lorem.paragraph(),
      isbn: faker.datatype.uuid(),
      copies,
      available_copies: copies,
      createdAt: new Date(),
      seeded: true,
    });
  }

  const userDocs = [];
  for (let i = 0; i < USERS; i++) {
    userDocs.push({
      name: faker.name.findName(),
      email: faker.internet.email(),
      passwordHash: 'seeded', // DO NOT use in production
      createdAt: new Date(),
      seeded: true,
    });
  }

  if (bookDocs.length) {
    const br = await booksColl.insertMany(bookDocs);
    console.log('Inserted books:', br.insertedCount);
  }
  if (userDocs.length) {
    const ur = await usersColl.insertMany(userDocs);
    console.log('Inserted users:', ur.insertedCount);
  }

  await client.close();
  console.log('Mongo seeding done.');
}

run().catch((err) => {
  console.error('Mongo seed error', err);
  process.exit(1);
});
