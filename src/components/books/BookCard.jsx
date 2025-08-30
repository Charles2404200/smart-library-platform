// src/components/books/BookCard.jsx
import React from 'react';
import { resolveImageUrl } from '../../utils/resolveImageUrl';

function joinish(v) {
  if (!v) return '';
  if (Array.isArray(v)) return v.filter(Boolean).join(', ');
  return String(v);
}

export default function BookCard({ book, onBorrow, onReviews, onReview }) {
  const avail = Number(book.available_copies ?? book.copies ?? 0);
  const isRetired = !!(book.retired || book._retired);
  const handleReviews = onReviews || onReview;

  const avg = Number(book.avg_rating ?? book.average_rating ?? book.avgRating ?? 0);
  const count = Number(book.reviews_count ?? book.review_count ?? book.countReviews ?? 0);

  const fullStars = Math.floor(avg);
  const hasHalfStar = avg - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  const imgSrc = resolveImageUrl(book.full_image_url || book.image_url);

  const authors = joinish(
    book.authors ??
    book.author_list ??
    book.author_names ??
    book.authorNames ??
    book.authorName ??
    book.author
  );
  const publisher = joinish(
    book.publisher ??
    book.publisher_name ??
    book.publisherName ??
    book.publisher_names ??
    book.publishers
  );
  const genre = joinish(
    book.genre ??
    book.genres ??
    book.category ??
    book.categories ??
    book.tags
  );

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
        <h2 className="text-xl font-semibold text-indigo-600">
          {book.title ?? book.name ?? 'Untitled'}
        </h2>
      </div>

      {/* Metadata: Author / Publisher / Genre */}
      <div className="text-sm text-gray-600 mt-2 space-y-1">
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
        {genre && (
          <p className="truncate" title={genre}>
            <span className="font-medium text-gray-700">Genre:</span> {genre}
          </p>
        )}
      </div>

      {/* Star Rating */}
      <div className="text-sm text-gray-500 mb-2 mt-2 flex items-center">
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <span key={`full-${i}`} className="text-yellow-500">★</span>
        ))}
        {/* Half star */}
        {hasHalfStar && <span className="text-yellow-500">☆</span>}
        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <span key={`empty-${i}`} className="text-gray-300">★</span>
        ))}
        <span className="ml-2 text-gray-600 text-xs">({count} reviews)</span>
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
