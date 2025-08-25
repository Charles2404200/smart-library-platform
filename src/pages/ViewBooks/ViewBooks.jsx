// src/pages/ViewBooks/ViewBooks.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getBooks, searchBooks as searchBooksAPI, getAvailability } from '../../services/booksService';
import { borrowBook } from '../../services/borrowService';
import { ReviewsAPI } from '../../services/reviews';
import BooksGrid from '../../components/books/BooksGrid';
import BorrowModal from '../../components/books/BorrowModal';
import ReviewsModal from '../../components/reviews/ReviewsModal';
import { API_URL } from '../../config/env';

const DEFAULT_LOAN_DAYS = 14;

function formatDateISO(d) {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function ViewBooksPage() {
  const [books, setBooks] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [borrowStatus, setBorrowStatus] = useState(null);

  const [borrowOpen, setBorrowOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [dueAt, setDueAt] = useState(null);
  const [borrowAt, setBorrowAt] = useState(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewBook, setReviewBook] = useState(null);

  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';

  // normalize book shape
  function normalizeBook(b) {
    const id = b.id ?? b.book_id;
    const image = b?.image_url ?? b?.image;
    const fullImg = image ? (image.startsWith('http') ? image : `${API_URL}/${image}`) : null;
    return {
      ...b,
      id,
      full_image_url: fullImg,
      avg_rating: Number(b.avg_rating ?? b.average_rating ?? 0),
      reviews_count: Number(b.reviews_count ?? b.review_count ?? 0),
      available_copies: b.available_copies ?? b.copies ?? 0,
    };
  }

  // hydrateAggregates removed from auto flow. Use loadAggregatesPage() below when needed.
  async function hydrateAggregates(list) {
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
            if (cur) map.set(key, { ...cur, avg_rating: avg, reviews_count: cnt });
          }
        });
        return Array.from(map.values());
      });
    }
  }

  // on-demand aggregate loader: fetch reviews aggregates for current page items
  async function loadAggregatesPage() {
    try {
      const visible = books || [];
      const targets = visible.filter((b) => (Number(b.avg_rating ?? 0) === 0 && Number(b.reviews_count ?? 0) === 0));
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
              if (cur) map.set(key, { ...cur, avg_rating: avg, reviews_count: cnt });
            }
          });
          return Array.from(map.values());
        });
      }
    } catch (e) {
      console.error('Error loading aggregates:', e);
    }
  }

  // ---- load all books
  async function loadBooks(withHydrate = true) {
    setLoading(true);
    try {
      const data = await getBooks();
      const rows = Array.isArray(data) ? data : data.books || [];
      const normalized = rows.map(normalizeBook);
      setBooks(normalized);

      // NOTE: we removed automatic hydration here to avoid many reviews requests.
      // If you want to hydrate aggregates automatically, call hydrateAggregates(normalized) or use the Load ratings button.
      if (withHydrate) {
        // intentionally left blank to avoid automatic heavy calls
      }
    } catch (err) {
      console.error('❌ Error fetching books:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(q) {
    if (!q || q.length < 1) {
      loadBooks(false);
      return;
    }

    let alive = true;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const data = await searchBooksAPI({ q, page: 1, pageSize: 24, sort: 'relevance' });
        const rows = Array.isArray(data) ? data : data.books || [];
        if (!alive) return;
        const normalized = rows.map(normalizeBook);
        setBooks(normalized);

        // removed auto hydration here: call loadAggregatesPage() manually if you want ratings
        // hydrateAggregates(normalized);
      } catch (e) {
        console.error('❌ search error:', e);
        if (alive) loadBooks(false);
      } finally {
        if (alive) setSearching(false);
      }
    }, 200);
    return () => { alive = false; clearTimeout(t); };
  }

  useEffect(() => {
    loadBooks(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // borrow flow - keep availability refresh after borrowing
  async function handleBorrowSubmit(payload) {
    // payload contains selectedBook, borrowAt, dueAt etc if your modal passes them; current code expects parent state
    if (!selectedBook) return;
    try {
      const res = await borrowBook({
        book_id: Number(selectedBook.id ?? selectedBook.book_id),
        borrow_at: borrowAt,
        due_at: dueAt,
      });
      setBorrowStatus(`✅ Borrowed "${selectedBook.title}" successfully`);

      // confirm with server availability
      const selId = Number(selectedBook.id ?? selectedBook.book_id);
      try {
        const fresh = await getAvailability(selId); // { available, copies, available_copies, retired }
        setBooks(prev =>
          prev.map(b => {
            const id = Number(b.id ?? b.book_id);
            return id === selId
              ? {
                  ...b,
                  copies: typeof fresh.copies === 'number' ? fresh.copies : b.copies,
                  available_copies: typeof fresh.available_copies === 'number'
                    ? fresh.available_copies
                    : (b.available_copies ?? b.copies),
                }
              : b;
          })
        );
      } catch (e) {
        console.error('Error refreshing availability after borrow:', e);
      }
    } catch (err) {
      console.error('Borrow failed:', err);
      setBorrowStatus(typeof err?.message === 'string' ? err.message : 'Borrow failed');
    } finally {
      setTimeout(() => {
        setBorrowOpen(false);
        setSelectedBook(null);
        // clear borrow/due values so next open will use defaults
        setBorrowAt(null);
        setDueAt(null);
      }, 600);
    }
  }

  // open modal and set default dates
  const openBorrowModal = (book) => {
    setSelectedBook(book);

    // default borrow date = today, due date = today + DEFAULT_LOAN_DAYS
    const today = new Date();
    const borrowDefault = formatDateISO(today);
    const dueDefault = formatDateISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() + DEFAULT_LOAN_DAYS));

    setBorrowAt(borrowDefault);
    setDueAt(dueDefault);

    setBorrowOpen(true);
  };
  const closeBorrowModal = () => {
    setBorrowOpen(false);
    setSelectedBook(null);
    // clear dates (next open will repopulate defaults)
    setBorrowAt(null);
    setDueAt(null);
  };

  const openReviews = (book) => {
    setReviewBook(book);
    setReviewOpen(true);
  };
  const closeReviews = () => {
    setReviewOpen(false);
    setReviewBook(null);
  };

  const handleAggregates = (bookId, avg, count) => {
    setBooks((prev) =>
      prev.map((b) => {
        const id = Number(b.id ?? b.book_id);
        return id === Number(bookId)
          ? { ...b, avg_rating: Number(avg || 0), reviews_count: Number(count || 0) }
          : b;
      })
    );
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Books</h1>
        <div>
          <button onClick={() => loadBooks(false)} className="px-3 py-1 border rounded mr-2">Refresh</button>
          <button onClick={() => loadAggregatesPage()} className="px-3 py-1 border rounded mr-2">Load ratings</button>
        </div>
      </div>

      <BooksGrid
        books={books}
        loading={loading || searching}
        onBorrow={openBorrowModal}
        onReviews={openReviews}
      />

      <BorrowModal
        open={borrowOpen}
        book={selectedBook}
        borrowAt={borrowAt}
        setBorrowAt={setBorrowAt}
        dueAt={dueAt}
        setDueAt={setDueAt}
        onClose={closeBorrowModal}
        onSubmit={handleBorrowSubmit}
        status={borrowStatus}
      />

      <ReviewsModal
        open={reviewOpen}
        onClose={closeReviews}
        book={reviewBook}
        isAuthenticated={false}
        currentUser={null}
        onAggregates={handleAggregates}
      />
    </div>
  );
}
