import React from 'react';
import BookCard from './BookCard';

export default function BooksGrid({ books, loading, onBorrow }) {
  if (loading) return <p className="text-gray-500">Loading books...</p>;
  if (!books || books.length === 0) return <p className="text-red-500">No books available.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {books.map((b) => (
        <BookCard key={b.id} book={b} onBorrow={onBorrow} />
      ))}
    </div>
  );
}
