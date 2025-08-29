// src/components/books/BookCard.jsx
import React from 'react';
import { resolveImageUrl } from '../../utils/resolveImageUrl';

export default function BookCard({ book, onBorrow, onReviews, onReview }) {
  const avail = Number(book.available_copies ?? book.copies ?? 0);
  const isRetired = !!(book.retired || book._retired);
  const handleReviews = onReviews || onReview;

  const id = Number(book.id ?? book.book_id); // normalized id

  const avg = Number(book.avg_rating ?? book.average_rating ?? book.avgRating ?? 0);
  const count = Number(book.reviews_count ?? book.review_count ?? book.countReviews ?? 0);
  const full = Math.round(avg);
  const stars = Array.from({ length: 5 }, (_, i) => (i < full ? '★' : '☆')).join('');

  const imgSrc = resolveImageUrl(book.full_image_url || book.image_url);

  // Flexible: supports "authors" as string or array; "publisher" or "publishers"
  const authors = Array.isArray(book.authors)
    ? book.authors.join(', ')
    : (book.authors || '');
  const publisher = book.publisher
    || (Array.isArray(book.publishers) ? book.publishers.join(', ') : (book.publishers || ''));

  return (
    <div className="bg-white p-4 border rounded-lg shadow hover:shadow-md transition">
      {imgSrc && (
        <img
          src={imgSrc}
          alt={book.title || 'Book cover'}
          className="w-full h-40 object-cover rounded-md mb-3"
          onError={(e) => { e.currentTarget.src = '/placeholder-book.png'; }}
        />
      )}

      <div className="flex items-start justify-between gap-2">
        <h2 className="text-xl font-semibold text-indigo-600">{book.title}</h2>
      </div>

      {/* Author + publisher */}
      <div className="text-sm text-gray-600 mt-1">
        {authors && (
          <p className="truncate" title={authors}>
            <span className="font-medium text-gray-700">Author:</span> {authors}
          </p>
        )}
        {publisher && (
          <p className="truncate" title={publisher}>
            <span className="font-medium text-gray-700">Publisher:</span> {publisher}
          </p>
        )}
      </div>

      <div className="text-sm text-gray-500 mb-2 mt-2">
        {stars} <span className="ml-1">({count})</span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span
          className={`px-2 py-1 rounded text-xs ${
            avail > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {avail} available
        </span>
        {isRetired && (
          <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">Retired</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* IMPORTANT: call onBorrow, do not navigate; also set type="button" */}
        <button
          type="button"
          className={`px-4 py-2 rounded ${
            isRetired || avail <= 0
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
          onClick={() => !isRetired && avail > 0 && onBorrow?.(book)}
          disabled={isRetired || avail <= 0}
        >
          {isRetired ? 'Retired' : avail > 0 ? 'Borrow' : 'Out of stock'}
        </button>

        <button
          type="button"
          className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 text-gray-800"
          onClick={() => handleReviews && handleReviews(book)}
        >
          Reviews
        </button>
      </div>
    </div>
  );
}
