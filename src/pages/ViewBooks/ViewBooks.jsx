// ===================== ViewBooks.jsx (UPDATED) =====================
// Drop-in replacement for: src/pages/ViewBooks/ViewBooks.jsx

import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getBooks, searchBooks as searchBooksAPI, getAvailability } from "../../services/booksService";
import { borrowBook } from "../../services/borrowService";
import BooksGrid from "../../components/books/BooksGrid";
import BorrowModal from "../../components/books/BorrowModal";
import ReviewsModal from "../../components/reviews/ReviewsModal";

export default function ViewBooksPage({ isAuthenticated = false, currentUser = null }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [activeQuery, setActiveQuery] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 24;
  const [hasSearched, setHasSearched] = useState(false);

  // state
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
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
    return b;
  }

  async function loadPage(p = 1) {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (activeQuery && activeQuery.trim().length > 0) {
        data = await searchBooksAPI({ q: activeQuery.trim(), page: p, pageSize: PAGE_SIZE, sort: 'relevance' });
      } else {
        data = await getBooks({ page: p, pageSize: PAGE_SIZE });
      }
      const rows = Array.isArray(data) ? data : (data?.books || data?.data || []);
      const normalized = rows.map(normalizeBook);
      setBooks(normalized);
    } catch (err) {
      console.error('Failed to load books:', err);
      setError('Failed to load books');
    } finally {
      setLoading(false);
    }
  }

  // Run search only after user presses the Search button; then paginate.
  useEffect(() => {
    if (!hasSearched) return;
    loadPage(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, hasSearched]);

  // Borrow flow
  const openBorrow = (book) => {
    setSelectedBook(book);
    setBorrowOpen(true);
  };

  const closeBorrow = () => {
    setBorrowOpen(false);
    setSelectedBook(null);
    setBorrowAt(null);
    setDueAt(null);
    setBorrowStatus(null);
  };

  // Reviews flow
  const openReviews = (book) => {
    setReviewBook(book);
    setReviewOpen(true);
  };

  const closeReviews = () => {
    setReviewOpen(false);
    setReviewBook(null);
  };

  function handleBorrowSubmit(e) {
    e.preventDefault();

    if (!selectedBook || !borrowAt || !dueAt) {
      setBorrowStatus("Please choose dates for your borrow period");
      return;
    }

    const payload = {
      bookId: selectedBook?.id || selectedBook?.bookId || selectedBook?._id,
      borrowerId: currentUser?.id || currentUser?._id,
      borrowAt,
      dueAt,
    };

    setBorrowStatus("Submitting borrow request...");

    borrowBook(payload)
      .then(async () => {
        setBorrowStatus("Borrow request submitted ✅");

        try {
          const fresh = await getAvailability(payload.bookId);
          setBooks((prev) => prev.map((b) =>
            (b.id === payload.bookId || b._id === payload.bookId || b.bookId === payload.bookId)
              ? { ...b, availability: fresh }
              : b
          ));
        } catch (_) {}
      })
      .catch((err) => {
        console.error(err);
        setBorrowStatus("Failed to submit. Please try again.");
      });
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">View Books</h1>

      <form
        onSubmit={(e) => { e.preventDefault(); setActiveQuery(q.trim()); setHasSearched(true); setPage(1); }}
        className="mb-4 flex gap-2 items-center"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search books (leave empty to show all)"
          className="border rounded px-3 py-2 flex-1"
        />
        <button type="submit" className="px-3 py-2 border rounded">Search</button>
      </form>

      {error && <div className="text-red-600 mb-4">{String(error)}</div>}

      {hasSearched ? (
        <>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">Page {page}</span>
            <div className="space-x-2">
              <button className="px-3 py-1 border rounded" disabled={page === 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
              <button className="px-3 py-1 border rounded" disabled={loading || (books && books.length < PAGE_SIZE)} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>

          <BooksGrid
            books={books}
            loading={loading}
            onBorrow={openBorrow}
            onReviews={openReviews}
          />

          <div className="mt-3 flex items-center justify-end gap-2">
            <button className="px-3 py-1 border rounded" disabled={page === 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
            <button className="px-3 py-1 border rounded" disabled={loading || (books && books.length < PAGE_SIZE)} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </>
      ) : (
        <p className="text-gray-600">Press <strong>Search</strong> to load books.</p>
      )}

      {/* Borrow Modal */}
      <BorrowModal
        open={borrowOpen}
        book={selectedBook}
        onClose={closeBorrow}
        borrowAt={borrowAt}
        dueAt={dueAt}
        setBorrowAt={setBorrowAt}
        setDueAt={setDueAt}
        status={borrowStatus}
        onSubmit={handleBorrowSubmit}
        isAuthenticated={isAuthenticated}
      />

      {/* Reviews Modal */}
      <ReviewsModal
        open={!!reviewOpen}
        onClose={closeReviews}
        book={reviewBook}
      />
    </div>
  );
}
