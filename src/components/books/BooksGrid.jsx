// src/components/books/BooksGrid.jsx
import React from 'react';
import BookCard from './BookCard';

export default function BooksGrid({
  books,
  loading,
  onBorrow,
  onReviews,
  onReview,          // legacy prop (fallback)
  page = 1,
  pageSize = 24,
  total = 0,         // 0 means "unknown total"
  onPageChange,      // function(newPage) => void
}) {
  const handleReviews = onReviews || onReview;

  if (loading) return <p className="text-gray-500">Loading books...</p>;
  if (!books || books.length === 0) {
    return (
      <div>
        <p className="text-red-500">No books available.</p>
        {/* Show disabled pager if caller provided paging; lets users know list is empty */}
        {onPageChange && (
          <div className="mt-4 flex items-center gap-2">
            <button className="px-4 py-2 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed">Previous</button>
            <span className="text-sm text-gray-600 px-2">Page 1 of 1</span>
            <button className="px-4 py-2 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed">Next</button>
          </div>
        )}
      </div>
    );
  }

  const currentPage = Math.max(1, Number(page) || 1);
  const knownTotal = Number.isFinite(Number(total)) && Number(total) > 0;
  const totalPages = knownTotal
    ? Math.max(1, Math.ceil(Number(total) / Number(pageSize || 1)))
    : Math.max(1, currentPage + (books.length === Number(pageSize || 0) ? 1 : 0)); // heuristic when total unknown

  const hasPrev = currentPage > 1;
  const hasNext = knownTotal ? currentPage < totalPages : books.length === Number(pageSize || 0);

  // "Showing X–Y" uses books.length (current slice only)
  const startIdx = (currentPage - 1) * Number(pageSize || 1) + 1;
  const endIdx = startIdx + books.length - 1;

  return (
    <div>
      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {books.map((b) => (
          <BookCard
            key={b.id ?? b.book_id ?? Math.random()}
            book={b}
            onBorrow={() => onBorrow && onBorrow(b)}
            onReviews={() => handleReviews && handleReviews(b)}
          />
        ))}
      </div>

      {/* Pagination controls — now ALWAYS shown if onPageChange exists */}
      {onPageChange && (
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-gray-600">
            Showing <span className="font-medium">{startIdx}</span>–<span className="font-medium">{endIdx}</span>
            {knownTotal && (
              <>
                {' '}of <span className="font-medium">{Number(total)}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => hasPrev && onPageChange(currentPage - 1)}
              disabled={!hasPrev}
              className={`px-4 py-2 rounded-lg border shadow-sm text-sm ${
                !hasPrev
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
              }`}
            >
              Previous
            </button>

            <span className="text-sm text-gray-600 px-2">
              Page {currentPage}{knownTotal ? ` of ${totalPages}` : ''}
            </span>

            <button
              type="button"
              onClick={() => hasNext && onPageChange(currentPage + 1)}
              disabled={!hasNext}
              className={`px-4 py-2 rounded-lg border shadow-sm text-sm ${
                !hasNext
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
