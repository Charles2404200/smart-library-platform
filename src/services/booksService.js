// src/services/booksService.js
import { http } from './http';

/** Fetch all books (list page) */
export async function getBooks() {
  // backend route: GET /api/books
  return http('/api/books');
}

/**
 * Search books (title-only, exact-first on backend)
 * params: { q, page=1, pageSize=24, sort='relevance', minRating }
 * Backend route: GET /api/books/search/all
 */
export async function searchBooks(params = {}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.sort) qs.set('sort', String(params.sort));
  if (params.minRating != null) qs.set('minRating', String(params.minRating));

  return http(`/api/books/search/all?${qs.toString()}`);
}
