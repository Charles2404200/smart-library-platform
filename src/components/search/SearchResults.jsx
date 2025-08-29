// src/components/search/SearchResults.jsx
import React from 'react';
import BooksGrid from '../books/BooksGrid';

/**
 * Forwards pagination + handlers to BooksGrid.
 */
export default function SearchResults({
  books,
  loading,
  onBorrow,
  onReviews,
  // pagination props (forwarded)
  page = 1,
  pageSize = 24,
  total = 0,
  onPageChange,
}) {
  return (
    <div>
      <BooksGrid
        books={books}
        loading={loading}
        onBorrow={onBorrow}
        onReviews={onReviews}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
      />
    </div>
  );
}
