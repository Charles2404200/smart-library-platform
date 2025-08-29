// src/components/search/SearchResults.jsx
import React from 'react';
import BooksGrid from '../books/BooksGrid';

export default function SearchResults({ books, loading, onBorrow, onReviews }) {
  return (
    <div>
      <BooksGrid
        books={books}
        loading={loading}
        onBorrow={onBorrow}
        onReviews={onReviews}
      />
    </div>
  );
}
