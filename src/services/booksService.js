// File: src/services/booksService.js
// Purpose: client-side service wrappers for book-related API calls
// - Enhanced searchBooksAdvanced: sends both named advanced fields and a fallback `q` (combined)
// - Trims/validates input, avoids sending empty values

import { http } from './http';

/** Fetch all books (list page) */
export async function getBooks() {
  // backend route: GET /api/books
  return http('/api/books');
}

/**
 * Legacy quick search used by ViewBooks page (keeps q-based behavior)
 * params: { q, page=1, pageSize=24, sort='relevance', minRating }
 * Backend route: GET /api/books/search/all
 */
export async function searchBooks(params = {}) {
  const qs = new URLSearchParams();
  const { q, page, pageSize, sort, minRating } = params;

  if (q != null && String(q).trim() !== '') qs.set('q', String(q).trim());
  if (page) qs.set('page', String(page));
  if (pageSize) qs.set('pageSize', String(pageSize));
  if (sort) qs.set('sort', String(sort));
  if (minRating != null) qs.set('minRating', String(minRating));

  const query = qs.toString() ? `?${qs.toString()}` : '';
  return http(`/api/books/search/all${query}`);
}

/**
 * Advanced search with multiple filters:
 * Accepts: { title, author, genre, publisher, page, pageSize, minRating }
 *
 * This function:
 *  - includes named params (title, author, genre, publisher) which the server may accept,
 *  - also builds a combined `q` from non-empty fields as a fallback in case backend only honors q.
 */
export async function searchBooksAdvanced(filters = {}) {
  const qs = new URLSearchParams();
  const {
    title = '',
    author = '',
    genre = '',
    publisher = '',
    page,
    pageSize,
    minRating,
  } = filters || {};

  // small helper: add only if meaningful
  const addIf = (key, value) => {
    if (value == null) return;
    const s = String(value).trim();
    if (s.length > 0) qs.set(key, s);
  };

  // Add named advanced fields
  addIf('title', title);
  addIf('author', author);
  addIf('genre', genre);
  addIf('publisher', publisher);

  // Also set 'q' as a combined fallback (helps backends that accept global q only)
  const combined = [title, author, genre, publisher]
    .map((x) => (x == null ? '' : String(x).trim()))
    .filter(Boolean)
    .join(' ')
    .trim();
  if (combined) qs.set('q', combined);

  // pagination + extras
  if (page) qs.set('page', String(page));
  if (pageSize) qs.set('pageSize', String(pageSize));
  if (minRating != null) qs.set('minRating', String(minRating));

  const query = qs.toString() ? `?${qs.toString()}` : '';

  // Helpful debug (only prints in browser console)
  if (typeof window !== 'undefined' && window.console && window.location) {
    // Only when running locally or dev; won't hurt in prod but you can remove it
    console.debug('[booksService] searchBooksAdvanced ->', `/api/books/search/all${query}`);
  }

  return http(`/api/books/search/all${query}`);
}

/**
 * Keep getAvailability exported here; other parts of the app use it.
 */
export async function getAvailability(bookId) {
  if (bookId === undefined || bookId === null) {
    throw new Error('getAvailability: bookId is required');
  }
  return http(`/api/books/${bookId}/availability`);
}
