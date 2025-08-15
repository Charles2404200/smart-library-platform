// src/pages/ViewBooks/ViewBooks.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { getBooks } from '../../services/booksService';
import { borrowBook } from '../../services/borrowService';
import { ReviewsAPI } from '../../services/reviews'; // ⭐ add
import BooksGrid from '../../components/books/BooksGrid';
import BorrowModal from '../../components/books/BorrowModal';
import ReviewsModal from '../../components/reviews/ReviewsModal';
import { API_URL } from '../../config/env';

export default function ViewBooksPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [borrowStatus, setBorrowStatus] = useState(null);

  // Borrow modal state
  const [borrowModalOpen, setBorrowModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [borrowAt, setBorrowAt] = useState('');
  const [dueAt, setDueAt] = useState('');

  // Reviews modal state
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewBook, setReviewBook] = useState(null);

  // Logged-in info
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  }, []);
  const isAuthenticated = !!localStorage.getItem('token');

  // ---- helpers
  const normalizeBook = (b) => {
    const id = b.id ?? b.book_id;
    const image = b?.image_url;
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
  };

  // ---- fetch aggregate for books missing it (FE fallback)
  async function hydrateAggregates(list) {
    // pick books that look like "no data yet"
    const targets = list.filter(b => (b.avg_rating === 0 && b.reviews_count === 0));

    if (targets.length === 0) return;

    // limit concurrency to avoid flooding
    const chunkSize = 6;
    for (let i = 0; i < targets.length; i += chunkSize) {
      const slice = targets.slice(i, i + chunkSize);
      const results = await Promise.allSettled(
        slice.map(b => ReviewsAPI.list(b.id ?? b.book_id))
      );
      // merge into state
      setBooks(prev => {
        const map = new Map(prev.map(x => [Number(x.id ?? x.book_id), { ...x }]));
        slice.forEach((b, idx) => {
          const r = results[idx];
          if (r.status === 'fulfilled' && r.value) {
            const avg = Number(r.value.avgRating ?? 0);
            const cnt = Number(r.value.count ?? 0);
            const key = Number(b.id ?? b.book_id);
            if (map.has(key)) {
              const cur = map.get(key);
              map.set(key, { ...cur, avg_rating: avg, reviews_count: cnt });
            }
          }
        });
        return Array.from(map.values());
      });
    }
  }

  // ---- load books
  async function loadBooks(withHydrate = true) {
    setLoading(true);
    try {
      const data = await getBooks();
      const rows = Array.isArray(data) ? data : data.books || [];
      const normalized = rows.map(normalizeBook);
      setBooks(normalized);
      // ⭐ If backend doesn't send aggregates, fetch them client-side
      if (withHydrate) {
        hydrateAggregates(normalized);
      }
    } catch (err) {
      console.error('❌ Error fetching books:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBooks(true); }, []);

  // open borrow modal
  const openBorrowModal = (book) => {
    const now = new Date();
    const plus14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const fmt = (d) => {
      const z = new Date(d);
      const iso = new Date(z.getTime() - z.getTimezoneOffset() * 60000).toISOString();
      return iso.slice(0, 16);
    };
    setSelectedBook(book);
    setBorrowAt(fmt(now));
    setDueAt(fmt(plus14));
    setBorrowModalOpen(true);
    setBorrowStatus(null);
  };

  const closeBorrowModal = () => {
    setBorrowModalOpen(false);
    setSelectedBook(null);
    setBorrowStatus(null);
  };

  async function handleBorrowSubmit(e) {
    e.preventDefault();
    if (!selectedBook) return;

    const token = localStorage.getItem('token');
    if (!token) return alert('Please log in to borrow a book.');
    if (new Date(dueAt) <= new Date(borrowAt)) {
      return alert('Due date must be after the borrow date/time.');
    }

    try {
      const result = await borrowBook({
        bookId: selectedBook.id ?? selectedBook.book_id,
        borrowAt,
        dueAt,
      });

      setBorrowStatus(`✅ Borrowed "${selectedBook.title}" successfully`);

      const returnedId = Number(
        result.book_id ?? result.bookId ?? result?.updated?.book_id ?? result?.updated?.bookId
      );
      const returnedAvail = result.available_copies ?? result?.updated?.available_copies;

      if (!Number.isNaN(returnedId) && typeof returnedAvail === 'number') {
        setBooks((prev) =>
          prev.map((b) => ((Number(b.id ?? b.book_id) === returnedId)
            ? { ...b, available_copies: returnedAvail }
            : b))
        );
      } else {
        const selId = Number(selectedBook.id ?? selectedBook.book_id);
        setBooks((prev) =>
          prev.map((b) =>
            Number(b.id ?? b.book_id) === selId
              ? { ...b, available_copies: Math.max(0, (b.available_copies ?? b.copies) - 1) }
              : b
          )
        );
      }

      if (new Date(dueAt) < new Date()) {
        alert('⚠️ Warning: your selected due date is already in the past!');
      }

      setTimeout(() => {
        closeBorrowModal();
        loadBooks(true); // sync final & re-hydrate if needed
      }, 600);
    } catch (err) {
      setBorrowStatus(`❌ Failed to borrow: ${err.message || 'Unknown error'}`);
    }
  }

  // Reviews open/close
  const openReviews = (book) => {
    setReviewBook(book);
    setReviewOpen(true);
  };
  const closeReviews = () => {
    setReviewOpen(false);
    setReviewBook(null);
  };

  // When reviews modal closes, refresh once to ensure aggregates are up to date
  useEffect(() => {
    if (!reviewOpen && reviewBook) {
      loadBooks(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewOpen]);

  // Receive live aggregates from modal and patch one book immediately
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
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-indigo-700">📖 All Available Books</h1>

      {borrowStatus && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded text-yellow-800">
          {borrowStatus}
        </div>
      )}

      <BooksGrid
        books={books}
        loading={loading}
        onBorrow={openBorrowModal}
        onReviews={openReviews}
      />

      <BorrowModal
        open={borrowModalOpen}
        book={selectedBook}
        borrowAt={borrowAt}
        dueAt={dueAt}
        setBorrowAt={setBorrowAt}
        setDueAt={setDueAt}
        onClose={closeBorrowModal}
        onSubmit={handleBorrowSubmit}
        status={borrowStatus}
      />

      <ReviewsModal
        open={reviewOpen}
        onClose={closeReviews}
        book={reviewBook}
        isAuthenticated={isAuthenticated}
        currentUser={currentUser}
        onAggregates={handleAggregates} // ⭐ live update stars/count
      />
    </div>
  );
}
