// src/services/booksService.js
// Modified: call the backend's GET /api/books/search/all for advanced search
// and keep caching/dedupe logic for list & availability.

import http from './http';

/**
 * Simple module-level cache for GET endpoints.
 * Keyed by request path (including query string).
 * Each entry: { data, expiresAt }
 */
const CACHE_TTL_MS = 30 * 1000; // 30s
const cache = new Map();
const inflight = new Map();

function cacheGet(key) {
  const e = cache.get(key);
  if (!e) return null;
  if (e.expiresAt && e.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return e.data;
}

function cacheSet(key, data, ttl = CACHE_TTL_MS) {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

/** wrapper that dedups inflight calls and caches GET results */
async function cachedGet(path, opts = {}) {
  const key = path;
  const cached = cacheGet(key);
  if (cached) {
    return cached;
  }
  if (inflight.has(key)) {
    return inflight.get(key);
  }
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

/** Fetch all books (list page) */
export async function getBooks({ page = 1, pageSize = 24 } = {}) {
  // backend route: GET /api/books?page=...&pageSize=...
  const qs = new URLSearchParams();
  qs.set('page', String(page));
  qs.set('pageSize', String(pageSize));
  const path = `/api/books?${qs.toString()}`;
  return cachedGet(path);
}

/**
 * Legacy quick search used by ViewBooks page (keeps q-based behavior)
 * params: { q, page=1, pageSize=24, sort='relevance', minRating }
 */
export async function searchBooks({ q = '', page = 1, pageSize = 24, sort = 'relevance', minRating } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (sort) params.set('sort', sort);
  if (minRating) params.set('minRating', String(minRating));
  const query = params.toString() ? `?${params.toString()}` : '';
  // Use cachedGet only if you want caching for searches. Here we call http directly.
  return http(`/api/books/search/all${query}`);
}

/**
 * Advanced search - calls existing backend GET /api/books/search/all using query parameters.
 * Accepts payload: { title, author, genre, publisher, q, page, pageSize, ... }
 */
export async function searchBooksAdvanced(payload = {}) {
  // Build query string from payload (ignore empty values)
  const params = new URLSearchParams();
  const allowed = ['title', 'author', 'genre', 'publisher', 'q', 'page', 'pageSize', 'sort', 'minRating'];
  Object.keys(payload || {}).forEach((k) => {
    const v = payload[k];
    if (v === undefined || v === null) return;
    const s = String(v).trim();
    if (s === '') return;
    // only include known keys to avoid surprises
    if (allowed.includes(k)) {
      params.set(k, s);
    } else {
      // include any other keys as well (flexible)
      params.set(k, s);
    }
  });

  const qs = params.toString() ? `?${params.toString()}` : '';
  return http(`/api/books/search/all${qs}`);
}

/**
 * Keep getAvailability exported here; other parts of the app use it.
 */
export async function getAvailability(bookId) {
  if (bookId === undefined || bookId === null) {
    throw new Error('getAvailability: bookId is required');
  }
  // Use cachedGet to dedupe inflight calls for availability
  return cachedGet(`/api/books/${bookId}/availability`);
}

// Optional: expose cache clear for debugging
export function _clearBooksCache() {
  cache.clear();
  inflight.clear();
}
