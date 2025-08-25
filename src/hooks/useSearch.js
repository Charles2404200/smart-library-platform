// src/hooks/useSearch.js
import { useState, useCallback } from 'react';
import { searchBooksAdvanced } from '../services/booksService';
import { ReviewsAPI } from '../services/reviews';
import { API_URL } from '../config/env';

/**
 * useSearch hook
 * Modified: By default we DO NOT hydrate aggregates (reviews/avg) automatically to avoid many API calls.
 * If you want to fetch aggregates for visible results, call the returned `hydrateAggregates` function manually.
 */
export function useSearch(initialFilters = { title: '', author: '', genre: '', publisher: '' }, options = { autoHydrate: false }) {
  const [filters, setFilters] = useState(initialFilters);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [borrowStatus, setBorrowStatus] = useState(null);

  const normalizeBook = useCallback((b) => {
    const id = b.id ?? b.book_id;
    const image = b?.image_url ?? b?.image;
    const fullImg = image && image.startsWith('http') ? image : (image ? `${API_URL}/${image}` : null);
    return {
      ...b,
      id,
      full_image_url: fullImg,
      avg_rating: Number(b.avg_rating ?? b.average_rating ?? b.avgRating ?? 0),
      reviews_count: Number(b.reviews_count ?? b.review_count ?? b.countReviews ?? 0),
      available_copies: b.available_copies ?? b.copies ?? 0,
    };
  }, []);

  async function hydrateAggregates(list) {
    // Fetch review aggregates only for given list of books (useful on-demand)
    const targets = list.filter((b) => (Number(b.avg_rating ?? 0) === 0 && Number(b.reviews_count ?? 0) === 0));
    if (targets.length === 0) return;

    const chunkSize = 6;
    for (let i = 0; i < targets.length; i += chunkSize) {
      const slice = targets.slice(i, i + chunkSize);
      const results = await Promise.allSettled(slice.map((b) => ReviewsAPI.list(Number(b.id ?? b.book_id))));
      setBooks((prev) => {
        const map = new Map(prev.map((x) => [Number(x.id ?? x.book_id), { ...x }]));
        slice.forEach((b, idx) => {
          const r = results[idx];
          if (r && r.status === 'fulfilled' && r.value) {
            const avg = Number(r.value.avgRating ?? 0);
            const cnt = Number(r.value.count ?? r.value.countReviews ?? r.value.reviews_count ?? 0);
            const key = Number(b.id ?? b.book_id);
            const cur = map.get(key);
            if (cur) {
              map.set(key, { ...cur, avg_rating: avg, reviews_count: cnt });
            }
          }
        });
        return Array.from(map.values());
      });
    }
  }

  const handleSearch = useCallback(async (opts = {}) => {
    // ensure safe trimming
    const payload = {
      title: (opts.title ?? filters.title ?? '').trim(),
      author: (opts.author ?? filters.author ?? '').trim(),
      genre: (opts.genre ?? filters.genre ?? '').trim(),
      publisher: (opts.publisher ?? filters.publisher ?? '').trim(),
      q: (opts.q ?? '').trim(),
      page: opts.page ?? 1,
      pageSize: opts.pageSize ?? 24,
    };

    setLoading(true);
    setBorrowStatus(null);

    try {
      const data = await searchBooksAdvanced(payload);
      const rows = Array.isArray(data) ? data : data?.books || data?.rows || [];
      const normalized = rows.map(normalizeBook);
      setBooks(normalized);

      // Do NOT automatically hydrate aggregates unless options.autoHydrate is true.
      if (options && options.autoHydrate) {
        hydrateAggregates(normalized);
      }

      return normalized;
    } catch (err) {
      console.error('[useSearch] Search failed:', err);
      setBooks([]);
      setBorrowStatus(typeof err?.message === 'string' ? `Search failed: ${err.message}` : 'Search failed');
      return [];
    } finally {
      setLoading(false);
    }
  }, [filters, normalizeBook, hydrateAggregates, options]);

  return {
    filters,
    setFilters,
    books,
    setBooks,
    loading,
    borrowStatus,
    setBorrowStatus,
    handleSearch,
    hydrateAggregates, // expose for on-demand use
  };
}

export default useSearch;
