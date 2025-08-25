// src/components/books/BookCard.jsx
import React from 'react';

export default function BookCard({ book, onBorrow, onReviews, onReview }) {
  const DEFAULT_COVER_SVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600" fill="none">
      <rect width="400" height="600" fill="url(#grad)"/>
      <g opacity="0.6" stroke-width="8">
        <path d="M80 530 V 70 H 320 V 530 L 200 480 L 80 530 Z" stroke="#CBD5E1" fill="#E2E8F0"/>
        <path d="M110 100 H 290" stroke="#CBD5E1"/>
        <path d="M110 130 H 290" stroke="#CBD5E1"/>
        <path d="M110 160 H 220" stroke="#CBD5E1"/>
      </g>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="32" fill="#94A3B8" font-weight="600">
        No Cover Available
      </text>
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#F8FAFC;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#F1F5F9;stop-opacity:1" />
        </linearGradient>
      </defs>
    </svg>
  `;
  const DEFAULT_COVER = `data:image/svg+xml;base64,${btoa(DEFAULT_COVER_SVG)}`;

  const imageUrl = book.full_image_url || book.image_url || DEFAULT_COVER;

  const avail = book.available_copies ?? book.copies;
  const isRetired = !!(book.retired || book._retired);
  const handleReviews = onReviews || onReview;

  const avg = Number(book.avg_rating ?? book.average_rating ?? book.avgRating ?? 0);
  const count = Number(book.reviews_count ?? book.review_count ?? book.countReviews ?? 0);
  const full = Math.round(avg);
  const stars = Array.from({ length: 5 }, (_, i) => (i < full ? '★' : '☆')).join('');

  return (
    <div className="bg-white p-4 border rounded-lg shadow hover:shadow-md transition flex flex-col">
      <div className="h-64 w-full flex justify-center items-center mb-3">
        <img
          src={imageUrl}
          alt={book.title}
          className="max-h-full w-auto object-contain rounded-md"
          onError={(e) => { e.currentTarget.src = DEFAULT_COVER; }}
        />
      </div>
      
      <div className="flex flex-col flex-grow">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-xl font-semibold text-indigo-600">{book.title}</h2>
          <span
            className={`ml-2 shrink-0 text-xs px-2 py-0.5 rounded ${
              isRetired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}
          >
            {isRetired ? 'Retired' : 'Active'}
          </span>
        </div>

        <div className="mt-1 mb-2 text-sm">
          <span className="text-amber-500 align-middle">{stars}</span>
          <span className="ml-2 text-gray-600 align-middle">
            {count > 0 ? `${avg.toFixed(1)} · ${count} review${count > 1 ? 's' : ''}` : 'No reviews yet'}
          </span>
        </div>
        <p className="text-gray-700 mb-1">📚 Author(s): {book.authors || '—'}</p>
        <p className="text-gray-600 text-sm">🏢 Publisher: {book.publisher || '—'}</p>
        <p className="text-gray-600 text-sm">🏷 Genre: {book.genre || '—'}</p>
        <p className="text-gray-800 font-medium">
          📦 Available / Total: {avail} / {book.copies}
        </p>

        <div className="mt-auto pt-3 flex flex-wrap gap-2">
          <button
            className={`px-4 py-2 text-white rounded ${
              isRetired
                ? 'bg-gray-400 cursor-not-allowed'
                : (avail > 0 ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed')
            }`}
            disabled={isRetired || avail <= 0}
            title={
              isRetired
                ? 'This book has been retired by library staff.'
                : avail <= 0
                ? 'No copies available right now.'
                : ''
            }
            onClick={() => !isRetired && avail > 0 && onBorrow && onBorrow(book)}
          >
            {isRetired ? 'Retired' : avail > 0 ? 'Borrow' : 'Out of stock'}
          </button>
          <button
            className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 text-gray-800"
            onClick={() => handleReviews && handleReviews(book)}
          >
            Reviews
          </button>
        </div>
      </div>
    </div>
  );
}