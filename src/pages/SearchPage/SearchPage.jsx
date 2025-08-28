// src/pages/SearchPage/SearchPage.jsx
import React, { useEffect, useState } from 'react';
import useSearch from '../../hooks/useSearch';
import SearchForm from '../../components/search/SearchForm';
import SearchResults from '../../components/search/SearchResults';
import { borrowBook } from '../../services/borrowService';
import BorrowModal from '../../components/books/BorrowModal';
import ReviewsModal from '../../components/reviews/ReviewsModal';
import { getAvailability } from '../../services/booksService';

const DEFAULT_LOAN_DAYS = 14;

function formatDateISO(d) {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function SearchPage() {
  // Use the search hook (does not auto-hydrate aggregates by default)
  const {
    filters,
    setFilters,
    books,
    setBooks,
    loading,
    handleSearch,
    hydrateAggregates,
  } = useSearch(undefined, { autoHydrate: false });

  // Borrow modal state & defaults (same behavior as ViewBooks)
  const [borrowOpen, setBorrowOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [borrowAt, setBorrowAt] = useState(null);
  const [dueAt, setDueAt] = useState(null);
  const [borrowStatus, setBorrowStatus] = useState(null);

  // Reviews modal state
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewBook, setReviewBook] = useState(null);

  // auth/context placeholders — keep compatible with ReviewsModal props
  // If you have a real auth context, replace these with real values.
  const isAuthenticated = false;
  const currentUser = null;

  // load default results on mount (optional)
  useEffect(() => {
    handleSearch({ q: '', page: 1, pageSize: 24 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // open borrow modal and set default dates
  const openBorrowModal = (book) => {
    setSelectedBook(book);

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
    // clear so next open will compute fresh defaults
    setBorrowAt(null);
    setDueAt(null);
  };

  // handle borrow submit (modal calls this)
  const handleBorrowSubmit = async () => {
    if (!selectedBook) return;
    try {
      await borrowBook({
        book_id: Number(selectedBook.id ?? selectedBook.book_id),
        borrow_at: borrowAt,
        due_at: dueAt,
      });
      setBorrowStatus(`✅ Borrowed "${selectedBook.title}" successfully`);

      // refresh availability for this book
      const selId = Number(selectedBook.id ?? selectedBook.book_id);
      try {
        const fresh = await getAvailability(selId);
        setBooks((prev) =>
          prev.map((b) => {
            const id = Number(b.id ?? b.book_id);
            if (id !== selId) return b;
            return {
              ...b,
              copies: typeof fresh.copies === 'number' ? fresh.copies : b.copies,
              available_copies: typeof fresh.available_copies === 'number'
                ? fresh.available_copies
                : (b.available_copies ?? b.copies),
            };
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
        setBorrowAt(null);
        setDueAt(null);
      }, 600);
    }
  };

  // reviews modal helpers
  const openReviews = (book) => {
    setReviewBook(book);
    setReviewOpen(true);
  };
  const closeReviews = () => {
    setReviewOpen(false);
    setReviewBook(null);
  };

  // optional handler to accept aggregates coming from ReviewsModal
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

  // convenience: trigger hydrateAggregates ON DEMAND for search results
  const loadRatingsForSearchResults = async () => {
    if (typeof hydrateAggregates === 'function') {
      try {
        await hydrateAggregates(books || []);
      } catch (e) {
        console.error('Failed to hydrate aggregates for search results:', e);
      }
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Advanced Search</h1>

      <SearchForm
        filters={filters}
        setFilters={setFilters}
        onSearch={() => handleSearch({ ...filters, page: 1, pageSize: 24 })}
        onClear={() => {
          setFilters({ title: '', author: '', genre: '', publisher: '' });
          handleSearch({ q: '', page: 1, pageSize: 24 });
        }}
        loading={loading}
      />

      <div className="mb-4 flex items-center justify-end gap-2">
        <button className="px-3 py-1 border rounded" onClick={() => handleSearch({ ...filters, page: 1, pageSize: 24 })}>
          Search
        </button>
        <button className="px-3 py-1 border rounded" onClick={loadRatingsForSearchResults}>
          Load ratings
        </button>
      </div>

      <SearchResults books={books} loading={loading} onBorrow={openBorrowModal} onReviews={openReviews} />

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
        isAuthenticated={isAuthenticated}
        currentUser={currentUser}
        onAggregates={handleAggregates}
      />
    </div>
  );
}
