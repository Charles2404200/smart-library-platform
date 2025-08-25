// src/components/books/BookCard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function BookCard({ book, onBorrow, onReviews, onReview }) {
  const navigate = useNavigate();
  const avail = book.available_copies ?? book.copies;
  const isRetired = !!(book.retired || book._retired);
  const handleReviews = onReviews || onReview;

  const id = Number(book.id ?? book.book_id); // <- normalized id

  const avg = Number(book.avg_rating ?? book.average_rating ?? book.avgRating ?? 0);
  const count = Number(book.reviews_count ?? book.review_count ?? book.countReviews ?? 0);
  const full = Math.round(avg);
  const stars = Array.from({ length: 5 }, (_, i) => (i < full ? '★' : '☆')).join('');

  return (
    <div className="bg-white p-4 border rounded-lg shadow hover:shadow-md transition">
      {book.image_url && (
        <img
          src={book.full_image_url || book.image_url}
          alt={book.title}
          className="w-full h-40 object-cover rounded-md mb-3"
        />
      )}

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

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className={`px-4 py-2 text-white rounded ${
            isRetired
              ? 'bg-gray-400 cursor-not-allowed'
              : (avail > 0 ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed')
          }`}
          disabled={isRetired || avail <= 0}
          title={isRetired ? 'This book has been retired by library staff.' : (avail <= 0 ? 'No copies available right now.' : '')}
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
  );
}
