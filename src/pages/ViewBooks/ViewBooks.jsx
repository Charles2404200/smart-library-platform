// src/pages/ViewBooks/ViewBooks.jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getBooks, fetchAllBooks, searchBooks as searchBooksAPI, getAvailability } from '../../services/booksService';
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

export default function ViewBooksPage({ isAuthenticated = false, currentUser = null }) {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';

  // state
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  // borrow modal state
  const [borrowOpen, setBorrowOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [borrowAt, setBorrowAt] = useState(null);
  const [dueAt, setDueAt] = useState(null);
  const [borrowStatus, setBorrowStatus] = useState(null);

  // reviews modal
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewBook, setReviewBook] = useState(null);

  // normalize book shapes from different backends
  function normalizeBook(b) {
    const id = b.id ?? b.book_id ?? b._id;
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

  // Load all books
  async function loadBooksAll() {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAllBooks(200);
      const normalized = (Array.isArray(rows) ? rows : (rows?.books || rows?.data || [])).map(normalizeBook);
      setBooks(normalized);
    } catch (err) {
      console.error('Failed to load books:', err);
      setError('Failed to load books');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (q && q.length > 0) {
      (async () => {
        setSearching(true);
        try {
          const data = await searchBooksAPI({ q, page: 1, pageSize: 200, sort: 'relevance' });
          const rows = Array.isArray(data) ? data : (data?.books || data?.data || []);
          setBooks(rows.map(normalizeBook));
        } catch (e) {
          console.error('Search failed:', e);
          setError('Search failed');
        } finally {
          setSearching(false);
        }
      })();
      return;
    }
    loadBooksAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Borrow flow
  const openBorrow = (book) => {
    setSelectedBook(book);
    const today = new Date();
    const borrowAtISO = formatDateISO(today);
    const due = new Date(today);
    due.setDate(due.getDate() + DEFAULT_LOAN_DAYS);
    setBorrowAt(borrowAtISO);
    setDueAt(formatDateISO(due));
    setBorrowOpen(true);
    setBorrowStatus(null);
  };

  const closeBorrow = () => {
    setBorrowOpen(false);
    setSelectedBook(null);
    setBorrowAt(null);
    setDueAt(null);
    setBorrowStatus(null);
  };

  async function handleBorrowSubmit() {
    if (!selectedBook) {
      setBorrowStatus('No book selected');
      return;
    }
    setBorrowStatus('Saving...');
    try {
      const payload = { bookId: selectedBook.id ?? selectedBook.book_id, borrowAt, dueAt };
      await borrowBook(payload);
      setBorrowStatus('Borrow successful');
      try {
        const fresh = await getAvailability(Number(selectedBook.id ?? selectedBook.book_id));
        setBooks((prev) =>
          prev.map((b) => {
            const id = b.id ?? b.book_id;
            return Number(id) === Number(selectedBook.id ?? selectedBook.book_id)
              ? { ...b, copies: fresh.copies, available_copies: fresh.available_copies }
              : b;
          })
        );
      } catch (e) {
        console.warn('Failed to refresh availability after borrow', e);
      }
    } catch (err) {
      console.error('Borrow failed', err);
      setBorrowStatus(err?.message ?? 'Borrow failed');
    }
  }

  // Reviews handlers
  const openReviews = (book) => {
    setReviewBook(book);
    setReviewOpen(true);
  };
  const closeReviews = () => {
    setReviewOpen(false);
    setReviewBook(null);
  };

  const handleAggregates = (bookId, avg, count) => {
    setBooks((prev) => prev.map((b) => (Number(b.id ?? b.book_id) === Number(bookId) ? { ...b, avg_rating: avg, reviews_count: count } : b)));
  };

  return (
    <div className="p-4">
      {loading && <p className="text-gray-600">Loading books...</p>}
      {error && <p className="text-red-600">{error}</p>}
      <BooksGrid
        books={books}
        loading={loading || searching}
        onBorrow={(b) => openBorrow(b)}
        onReviews={(b) => openReviews(b)}
      />

      <BorrowModal
        open={borrowOpen}
        book={selectedBook}
        borrowAt={borrowAt}
        dueAt={dueAt}
        setBorrowAt={setBorrowAt}
        setDueAt={setDueAt}
        onClose={closeBorrow}
        onSubmit={handleBorrowSubmit}
        status={borrowStatus}
      />

      <ReviewsModal
        open={reviewOpen}
        onClose={closeReviews}
        book={reviewBook}
        isAuthenticated={isAuthenticated}
        currentUser={currentUser}
        onAggregates={handleAggregates}
      />
    </div>
  );
}
