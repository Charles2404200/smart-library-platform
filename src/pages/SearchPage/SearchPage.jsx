// src/pages/SearchPage/SearchPage.jsx
import React, { useMemo, useState } from 'react';
import useSearch from '../../hooks/useSearch';
import SearchForm from '../../components/search/SearchForm';
import SearchResults from '../../components/search/SearchResults';
import { borrowBook } from '../../services/borrowService';
import BorrowModal from '../../components/books/BorrowModal';
import ReviewsModal from '../../components/reviews/ReviewsModal';

export default function SearchPage() {
  const {
    filters,
    setFilters,
    books,
    setBooks,
    loading,
    borrowStatus,
    setBorrowStatus,
    handleSearch,
  } = useSearch();

  const [borrowModalOpen, setBorrowModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [borrowAt, setBorrowAt] = useState('');
  const [dueAt, setDueAt] = useState('');

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewBook, setReviewBook] = useState(null);

  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  }, []);
  const isAuthenticated = !!localStorage.getItem('token');

  const handleClear = () => {
    setFilters({ title: '', author: '', genre: '', publisher: '' });
    setBooks([]);
    setBorrowStatus(null);
  };

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
      }, 600);
    } catch (err) {
      setBorrowStatus(`❌ Failed to borrow: ${err.message || 'Unknown error'}`);
    }
  }

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
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-indigo-700">Advanced Book Search</h1>

      <SearchForm
        filters={filters}
        setFilters={setFilters}
        onSearch={() => handleSearch()}
        onClear={handleClear}
        loading={loading}
      />

      {borrowStatus && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded text-yellow-800">
          {borrowStatus}
        </div>
      )}

      <SearchResults
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
        onAggregates={handleAggregates}
      />
    </div>
  );
}
