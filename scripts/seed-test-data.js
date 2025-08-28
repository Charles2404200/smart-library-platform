// scripts/seed-test-data.js
// Modified: defaults to /api/admin/books and logs created IDs to scripts/seed-results.json
// ESM; Node 18+ recommended
//
// Install deps (once):
//   npm install --save-dev @faker-js/faker axios dotenv
//
// Example run:
//   node scripts/seed-test-data.js --api http://localhost:4000 --books 50 --users 10
// Or rely on .env (ADMIN_EMAIL / ADMIN_PASSWORD) to auto-login.

import 'dotenv/config';
import { faker } from '@faker-js/faker';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

function parseArgs() {
  const argv = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}
const ARGS = parseArgs();

// Config (env-aware). NOTE: default BOOKS_PATH set to admin create path discovered.
const API_BASE = ARGS.api || process.env.API_BASE || `http://localhost:${process.env.PORT || 4000}`;
const BOOKS_COUNT = parseInt(ARGS.books || process.env.SEED_BOOKS || '100', 10);
const USERS_COUNT = parseInt(ARGS.users || process.env.SEED_USERS || '10', 10);
const BORROWS_COUNT = parseInt(ARGS.borrows || process.env.SEED_BORROWS || '0', 10);
const CONCURRENCY = parseInt(ARGS.concurrency || process.env.SEED_CONCURRENCY || '8', 10);
let ADMIN_TOKEN = ARGS.token || process.env.SEED_ADMIN_TOKEN || process.env.ADMIN_TOKEN || null;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || ARGS.adminEmail || null;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ARGS.adminPassword || null;

const BOOKS_PATH = ARGS['books-path'] || process.env.BOOKS_PATH || '/api/admin/books'; // <-- default changed
const REGISTER_PATH = ARGS['register-path'] || process.env.REGISTER_PATH || '/api/auth/register';
const LOGIN_PATH = ARGS['login-path'] || process.env.LOGIN_PATH || '/api/auth/login';
const BORROW_PATH = ARGS['borrow-path'] || process.env.BORROW_PATH || '/api/borrow/borrow';
const VERBOSE = Boolean(ARGS.verbose || process.env.SEED_VERBOSE);
const OUT_FILE = path.resolve(process.cwd(), 'scripts', 'seed-results.json');

function makeClient(token) {
  const c = axios.create({
    baseURL: API_BASE,
    timeout: 30_000,
    headers: { Accept: 'application/json' },
  });
  if (token) c.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  c.defaults.headers.post['Content-Type'] = 'application/json';
  return c;
}

async function attemptAdminLogin() {
  if (ADMIN_TOKEN) return ADMIN_TOKEN;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn('No ADMIN_TOKEN provided and ADMIN_EMAIL/ADMIN_PASSWORD missing from env. Skipping auto-login.');
    return null;
  }
  console.log(`Attempting admin login at ${API_BASE}${LOGIN_PATH} using ADMIN_EMAIL from .env`);
  try {
    const client = makeClient(null);
    const resp = await client.post(LOGIN_PATH, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const body = resp.data || {};
    const token = body.token || body.accessToken || body.jwt || (body.data && (body.data.token || body.data.accessToken));
    if (token) {
      ADMIN_TOKEN = token;
      console.log('Obtained admin token via login.');
      return token;
    }
    console.warn('Login succeeded but no token found in response; response data:', body);
    return null;
  } catch (err) {
    console.warn('Admin login attempt failed:', err?.response?.status || err?.message);
    return null;
  }
}

async function pool(items, worker, concurrency = 8) {
  const results = [];
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => worker(item));
    results.push(p);

    if (concurrency <= 0) continue;
    const e = p.then(() => executing.splice(executing.indexOf(e), 1));
    executing.push(e);
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

// Robust name helpers for faker versions
function getFirstName() {
  if (faker && typeof faker === 'object') {
    if (faker.name && typeof faker.name.firstName === 'function') return faker.name.firstName();
    if (faker.person && typeof faker.person.firstName === 'function') return faker.person.firstName();
    if (faker.name && typeof faker.name.first === 'function') return faker.name.first();
  }
  return `First${Math.floor(Math.random()*10000)}`;
}
function getLastName() {
  if (faker && typeof faker === 'object') {
    if (faker.name && typeof faker.name.lastName === 'function') return faker.name.lastName();
    if (faker.person && typeof faker.person.lastName === 'function') return faker.person.lastName();
    if (faker.name && typeof faker.name.last === 'function') return faker.name.last();
  }
  return `Last${Math.floor(Math.random()*10000)}`;
}

function makeFakeBook() {
  const title = (faker.lorem && typeof faker.lorem.words === 'function') ? faker.lorem.words(3) : `Book ${Math.random().toString(36).slice(2,8)}`;
  const authors = [ `${getFirstName()} ${getLastName()}` ];
  const copies = faker.datatype && typeof faker.datatype.number === 'function' ? faker.datatype.number({ min: 1, max: 12 }) : Math.floor(Math.random()*12)+1;
  return {
    title,
    // shape the payload to the server's GET response example:
    genre: (faker.helpers && faker.helpers.arrayElement) ? faker.helpers.arrayElement(['Fiction','Classic','Mystery','Romance','Sci-Fi']) : 'Fiction',
    publisher: faker.company ? (faker.company.name ? faker.company.name() : 'Acme') : 'Acme',
    copies,
    available_copies: copies,
    authors: authors.join(', '),
    image_url: null,
    retired: 0,
    description: faker.lorem ? (faker.lorem.sentence ? faker.lorem.sentence() : '') : '',
    isbn: faker.datatype && faker.datatype.uuid ? faker.datatype.uuid() : null,
  };
}

function makeFakeUser() {
  const first = getFirstName();
  const last = getLastName();
  const email = (faker.internet && typeof faker.internet.email === 'function')
    ? faker.internet.email(first, last).toLowerCase()
    : `${first}.${last}@example.com`.toLowerCase();
  const password = 'Password123!';
  const name = `${first} ${last}`;
  return { name, email, password };
}

// Create users (register) - usually doesn't require admin token
async function createUsers(count) {
  console.log(`Creating ${count} users at ${API_BASE}${REGISTER_PATH}`);
  const client = makeClient(null);
  const items = Array.from({ length: count }).map(() => makeFakeUser());
  const created = [];
  await pool(items, async (payload) => {
    try {
      const resp = await client.post(REGISTER_PATH, payload);
      // Try to extract id from response
      const id = resp?.data?.id ?? resp?.data?._id ?? resp?.data?.user_id ?? resp?.data?.user?.id ?? null;
      created.push({ id, payload, resp: resp.data });
      if (VERBOSE) console.log('user created', resp.data);
    } catch (err) {
      console.warn('register failed for', payload.email, err?.response?.status || err?.message);
      if (ADMIN_TOKEN) {
        try {
          const adminClient = makeClient(ADMIN_TOKEN);
          const fallbackPath = '/api/users';
          const resp2 = await adminClient.post(fallbackPath, payload);
          const id2 = resp2?.data?.id ?? resp2?.data?._id ?? null;
          created.push({ id: id2, payload, resp: resp2.data });
        } catch (err2) {
          console.error('admin fallback user create failed', err2?.message || err2?.response?.status);
        }
      }
    }
  }, CONCURRENCY);
  console.log(`Users created: ${created.length}/${count}`);
  return created;
}

// Create books using admin endpoint (we default to /api/admin/books)
// scripts/seed-test-data.js  -- replace createBooks function with this version
async function createBooks(count, client) {
  console.log(`Creating ${count} books at ${API_BASE}${BOOKS_PATH} (concurrency=${CONCURRENCY})`);
  const created = [];
  const items = Array.from({ length: count }).map(() => makeFakeBook());

  const maxRetries = 3;

  // Do concurrency aware processing but retry on ER_DUP_ENTRY or 5xx
  await pool(items, async (payload) => {
    let attempt = 0;
    while (attempt < maxRetries) {
      attempt++;
      try {
        const resp = await client.post(BOOKS_PATH, payload);
        const bookId = resp?.data?.book_id ?? resp?.data?.id ?? resp?.data?._id ?? null;
        created.push({ id: bookId, payload, resp: resp.data });
        if (VERBOSE) console.log('book created', resp.data);
        break;
      } catch (err) {
        const status = err?.response?.status;
        const code = err?.response?.data?.code || err?.code;
        const msg = err?.response?.data || err?.message;
        console.warn(`book create failed (attempt ${attempt})`, status || code, msg);

        // If duplicate primary key on server (ER_DUP_ENTRY) retry after backoff
        if (err && err.code === 'ER_DUP_ENTRY') {
          const backoff = 200 * attempt;
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }

        // Retry 5xx server errors
        if (!status || (status >= 500 && status < 600)) {
          const backoff = 200 * attempt;
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }

        // Non-retryable error (4xx) — record and break
        created.push({ id: null, payload, error: msg });
        break;
      }
    }
  }, CONCURRENCY);

  console.log(`Books created: ${created.filter(r => r.id).length}/${count}`);
  return created;
}


async function createBorrows(count, books, users, client) {
  if (!books.length || !users.length) {
    console.warn('No books or users available for borrow creation.');
    return [];
  }
  console.log(`Creating ${count} borrow records at ${API_BASE}${BORROW_PATH}`);
  const items = Array.from({ length: count }).map(() => {
    const book = faker.helpers && typeof faker.helpers.arrayElement === 'function' ? faker.helpers.arrayElement(books) : books[Math.floor(Math.random()*books.length)];
    const user = faker.helpers && typeof faker.helpers.arrayElement === 'function' ? faker.helpers.arrayElement(users) : users[Math.floor(Math.random()*users.length)];
    const borrowAt = new Date(Date.now() - Math.floor(Math.random()*30)*24*60*60*1000);
    const dueAt = new Date(borrowAt.getTime() + 1000 * 60 * 60 * 24 * (7 + Math.floor(Math.random()*14)));
    const bookId = book.id ?? book._id ?? book.book_id ?? book.id;
    const userId = user.id ?? user._id ?? user.user_id ?? user.userId ?? user.id;
    return {
      bookId, book_id: bookId,
      userId, user_id: userId,
      borrowAt: borrowAt.toISOString().slice(0,10), borrow_at: borrowAt.toISOString().slice(0,10),
      dueAt: dueAt.toISOString().slice(0,10), due_at: dueAt.toISOString().slice(0,10),
    };
  });

  const created = [];
  await pool(items, async (payload) => {
    try {
      const resp = await client.post(BORROW_PATH, payload);
      created.push(resp.data);
    } catch (err) {
      console.warn('borrow create failed', err?.response?.status || err?.message);
    }
  }, CONCURRENCY);
  console.log(`Borrows created: ${created.length}/${count}`);
  return created;
}

async function saveResults(obj) {
  try {
    await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
    await fs.writeFile(OUT_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    console.log('Seed results written to', OUT_FILE);
  } catch (err) {
    console.warn('Failed to write seed results:', err?.message || err);
  }
}

async function main() {
  console.log('Seed script starting with config:', {
    API_BASE, BOOKS_COUNT, USERS_COUNT, BORROWS_COUNT, CONCURRENCY, BOOKS_PATH, REGISTER_PATH, BORROW_PATH,
  });

  if (!ADMIN_TOKEN) {
    const token = await attemptAdminLogin();
    if (token) ADMIN_TOKEN = token;
  }

  const client = makeClient(ADMIN_TOKEN);

  // create users first (so we can reference them for borrows if needed)
  const createdUsers = USERS_COUNT > 0 ? await createUsers(USERS_COUNT) : [];
  // create books (admin create)
  const createdBooks = BOOKS_COUNT > 0 ? await createBooks(BOOKS_COUNT, client) : [];

  // create borrows optionally
  let createdBorrows = [];
  if (BORROWS_COUNT > 0) {
    // map to minimal usable arrays for IDs
    const booksForBorrows = createdBooks.filter(b => b.id).map(b => ({ id: b.id }));
    const usersForBorrows = createdUsers.filter(u => u.id).map(u => ({ id: u.id }));
    createdBorrows = await createBorrows(BORROWS_COUNT, booksForBorrows, usersForBorrows, client);
  }

  // Save a results file for cleanup / inspection
  const results = {
    timestamp: new Date().toISOString(),
    apiBase: API_BASE,
    booksPath: BOOKS_PATH,
    createdUsers,
    createdBooks,
    createdBorrows,
  };
  await saveResults(results);

  console.log('Seeding complete. Summary:');
  console.log(`Created books (success): ${createdBooks.filter(b => b.id).length}/${createdBooks.length}`);
  console.log(`Created users: ${createdUsers.length}`);
  console.log(`Created borrows: ${createdBorrows.length}`);
  if (ADMIN_TOKEN) console.log('Used admin token for authenticated operations.');
  else console.log('No admin token - some operations may have been unauthenticated or failed.');
}

main().catch((err) => {
  console.error('Seed script fatal error:', err);
  process.exit(1);
});
