// src/components/search/SearchResults.jsx
import React from 'react';
import BooksGrid from '../books/BooksGrid';

/**
 * Forwards pagination + handlers to BooksGrid.
 * Accepts `books` (array) from the page.
 */
export default function SearchResults({
  books = [],         // ensure array
  loading,
  onBorrow,
  onReviews,
  page = 1,
  pageSize = 24,
  total = 0,
  onPageChange,
}) {
  return (
    <div>
      <BooksGrid
        books={Array.isArray(books) ? books : []}
        loading={!!loading}
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
