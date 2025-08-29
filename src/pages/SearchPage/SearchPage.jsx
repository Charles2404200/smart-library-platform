// ===================== SearchPage.jsx (UPDATED) =====================
// Drop-in replacement for: src/pages/SearchPage/SearchPage.jsx

import React, { useEffect, useState } from "react";
import SearchForm from "../../components/search/SearchForm";
import SearchResults from "../../components/search/SearchResults";
import BorrowModal from "../../components/books/BorrowModal";
import ReviewsModal from "../../components/reviews/ReviewsModal";
import useSearch from "../../hooks/useSearch";

export default function SearchPage({ isAuthenticated = false, currentUser = null }) {
  const {
    filters,
    setFilters,
    books,
    loading,
    error,
    selectedBook,
    setSelectedBook,
    borrowAt,
    setBorrowAt,
    dueAt,
    setDueAt,
    borrowStatus,
    setBorrowStatus,
    handleSearch,
    handleBorrowSubmit,
    reviewOpen,
    setReviewOpen,
    reviewBook,
    setReviewBook,
  } = useSearch({ isAuthenticated, currentUser });

  // pagination & search control
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 24;
  const [hasSearched, setHasSearched] = useState(false);

  // fetch when page changes (after first explicit search)
  useEffect(() => {
    if (!hasSearched) return;
    handleSearch({ ...filters, page, pageSize: PAGE_SIZE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // open borrow modal
  const openBorrow = (book) => {
    setSelectedBook(book);
  };

  const closeBorrow = () => {
    setSelectedBook(null);
    setBorrowAt(null);
    setDueAt(null);
    setBorrowStatus(null);
  };

  // open reviews modal
  const openReviews = (book) => {
    setReviewBook(book);
    setReviewOpen(true);
  };

  const closeReviews = () => {
    setReviewOpen(false);
    setReviewBook(null);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Search Books</h1>

      <SearchForm
        filters={filters}
        setFilters={setFilters}
        onSearch={() => { setHasSearched(true); setPage(1); handleSearch({ ...filters, page: 1, pageSize: PAGE_SIZE }); }}
        onClear={() => { setFilters({ title: '', author: '', genre: '', publisher: '' }); setHasSearched(false); setPage(1); }}
        loading={loading}
      />

      <div className="flex items-center gap-2 mb-4">
        <button
          className="px-4 py-2 border rounded disabled:opacity-50"
          disabled={loading}
          onClick={() => { setHasSearched(true); setPage(1); handleSearch({ ...filters, page: 1, pageSize: PAGE_SIZE }); }}
        >
          Search
        </button>
        <button
          className="px-4 py-2 border rounded"
          onClick={() => { setFilters({ title: '', author: '', genre: '', publisher: '' }); setHasSearched(false); setPage(1); }}
        >
          Clear
        </button>
      </div>

      {error && (
        <div className="text-red-600 mb-4">{String(error)}</div>
      )}

      {hasSearched ? (
        <>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">Page {page}</span>
            <div className="space-x-2">
              <button
                className="px-3 py-1 border rounded"
                disabled={page === 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                className="px-3 py-1 border rounded"
                disabled={loading || (books && books.length < PAGE_SIZE)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>

          <SearchResults
            books={books}
            loading={loading}
            onBorrow={openBorrow}
            onReviews={openReviews}
          />

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              className="px-3 py-1 border rounded"
              disabled={page === 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              className="px-3 py-1 border rounded"
              disabled={loading || (books && books.length < PAGE_SIZE)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <p className="text-gray-600">Press <strong>Search</strong> to load books.</p>
      )}

      {/* Borrow Modal */}
      <BorrowModal
        open={!!selectedBook}
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
