// src/services/booksService.js
// Book-related API helpers: cached GET, list, search, availability, and fetchAllBooks (pages automatically).

import http from './http';

/**
 * Simple in-memory cache for GET endpoints (short TTL).
 * Keyed by full request path (including query string).
 */
const CACHE_TTL_MS = 30 * 1000; // 30s
const cache = new Map();
const inflight = new Map();

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key, data, ttl = CACHE_TTL_MS) {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

/**
 * cachedGet: dedupe inflight requests and cache results.
 * Returns whatever `http()` returns (usually parsed JSON).
 */
async function cachedGet(path, opts = {}) {
  const key = path;
  const cached = cacheGet(key);
  if (cached !== null) return cached;
  if (inflight.has(key)) return inflight.get(key);

  const p = (async () => {
    try {
      const res = await http(path, opts);
      cacheSet(key, res);
      return res;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}

/**
 * GET /api/books?page=...&pageSize=...
 * Backend in this project returns an array of book rows for this route.
 */
export async function getBooks({ page = 1, pageSize = 24 } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  const path = `/api/books?${params.toString()}`;
  return cachedGet(path);
}

/**
 * searchBooks (legacy q-based search used by some pages)
 * Calls backend `/api/books/search/all?q=...&page=...&pageSize=...`
 */
export async function searchBooks({ q = '', page = 1, pageSize = 24, sort = 'relevance', minRating } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (sort) params.set('sort', sort);
  if (minRating) params.set('minRating', String(minRating));
  const query = params.toString() ? `?${params.toString()}` : '';
  return http(`/api/books/search/all${query}`);
}

/**
 * Advanced search wrapper (keeps flexible payload).
 * Example payload keys: title, author, genre, publisher, q, page, pageSize, sort, minRating
 */
export async function searchBooksAdvanced(payload = {}) {
  const params = new URLSearchParams();
  Object.keys(payload || {}).forEach((k) => {
    const v = payload[k];
    if (v === undefined || v === null) return;
    const s = String(v).trim();
    if (s === '') return;
    params.set(k, s);
  });
  const qs = params.toString() ? `?${params.toString()}` : '';
  return http(`/api/books/search/all${qs}`);
}

/**
 * Fetch single book availability (cached).
 * Backend route: GET /api/books/:id/availability
 */
export async function getAvailability(bookId) {
  if (bookId === undefined || bookId === null) {
    throw new Error('getAvailability: bookId is required');
  }
  return cachedGet(`/api/books/${bookId}/availability`);
}

/**
 * fetchAllBooks(batchSize = 200)
 *
 * Repeatedly calls getBooks({ page, pageSize }) and accumulates results until
 * a page returns fewer than batchSize items. Returns an array of rows.
 */
export async function fetchAllBooks(batchSize = 200) {
  const all = [];
  let page = 1;

  while (true) {
    const data = await getBooks({ page, pageSize: batchSize });

    // backend might return an array directly, or { books: [...] } or { data: [...] }
    const rows = Array.isArray(data) ? data : (data && (data.books || data.data || []));
    if (!Array.isArray(rows)) break;
    if (rows.length === 0) break;

    all.push(...rows);

    if (rows.length < batchSize) break; // last page
    page += 1;

    // safety guard
    if (page > 1000) break;
  }

  return all;
}

/** Debug helper */
export function _clearBooksCache() {
  cache.clear();
  inflight.clear();
}
