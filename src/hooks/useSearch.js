// src/hooks/useSearch.js
import { useState, useCallback } from 'react';
import { searchBooksAdvanced } from '../services/booksService';
import { ReviewsAPI } from '../services/reviews';
import { API_URL } from '../config/env';

export function useSearch(initialFilters = { title: '', author: '', genre: '', publisher: '' }) {
  const [filters, setFilters] = useState(initialFilters);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [borrowStatus, setBorrowStatus] = useState(null);

  const normalizeBook = useCallback((b) => {
    const id = b.id ?? b.book_id;
    const image = b?.image_url ?? b?.image;
    const fullImg = image
      ? (image.startsWith('http')
          ? image
          : `${API_URL}${image.startsWith('/') ? '' : '/'}${image}`)
      : undefined;

    return {
      ...b,
      id,
      full_image_url: fullImg,
      avg_rating: Number(b.avg_rating ?? b.average_rating ?? b.avgRating ?? 0),
      reviews_count: Number(b.reviews_count ?? b.review_count ?? b.countReviews ?? 0),
      available_copies: b.available_copies ?? b.copies ?? 0,
    };
  }, []);

  // ---- BATCHED hydrateAggregates: collect results and update state ONCE
  const hydrateAggregates = useCallback(async (list) => {
    try {
      const targets = (list || []).filter((b) => Number(b.avg_rating ?? 0) === 0 && Number(b.reviews_count ?? 0) === 0);
      if (!targets.length) return;

      const resultMap = new Map(); // key -> { avg, count }
      const chunkSize = 6;

      for (let i = 0; i < targets.length; i += chunkSize) {
        const slice = targets.slice(i, i + chunkSize);
        const promises = slice.map((b) => ReviewsAPI.list(Number(b.id ?? b.book_id)));
        const settled = await Promise.allSettled(promises);

        settled.forEach((r, idx) => {
          if (r && r.status === 'fulfilled' && r.value) {
            const avg = Number(r.value.avgRating ?? 0);
            const cnt = Number(r.value.count ?? r.value.countReviews ?? r.value.reviews_count ?? 0);
            const key = Number(slice[idx].id ?? slice[idx].book_id);
            resultMap.set(key, { avg, cnt });
          }
        });
      }

      if (resultMap.size === 0) return;

      // Apply all changes in a single state update
      setBooks((prev) => {
        if (!Array.isArray(prev) || prev.length === 0) return prev;
        return prev.map((b) => {
          const key = Number(b.id ?? b.book_id);
          const r = resultMap.get(key);
          if (!r) return b;
          return { ...b, avg_rating: r.avg, reviews_count: r.cnt };
        });
      });
    } catch (err) {
      console.error('[useSearch] hydrateAggregates error:', err);
    }
  }, []);

  const handleSearch = useCallback(async (opts = {}) => {
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

      // If you want aggregates automatically, keep this; otherwise call hydrateAggregates only on demand (recommended).
      // hydrateAggregates(normalized);
      return normalized;
    } catch (err) {
      console.error('[useSearch] Search failed:', err);
      setBooks([]);
      setBorrowStatus(typeof err?.message === 'string' ? `Search failed: ${err.message}` : 'Search failed');
      return [];
    } finally {
      setLoading(false);
    }
  }, [filters, normalizeBook, hydrateAggregates]);

  return {
    filters,
    setFilters,
    books,
    setBooks,
    loading,
    borrowStatus,
    setBorrowStatus,
    handleSearch,
    hydrateAggregates,
  };
}

export default useSearch;
