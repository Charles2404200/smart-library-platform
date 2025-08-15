import React from 'react';

export default function BookCard({ book, onBorrow }) {
  const avail = book.available_copies ?? book.copies;

  return (
    <div className="bg-white p-4 border rounded-lg shadow hover:shadow-md transition">
      {book.image_url && (
        <img
          src={book.full_image_url || book.image_url}
          alt={book.title}
          className="w-full h-40 object-cover rounded-md mb-3"
        />
      )}

      <h2 className="text-xl font-semibold text-indigo-600">{book.title}</h2>
      <p className="text-gray-700 mb-1">📚 Author(s): {book.authors}</p>
      <p className="text-gray-600 text-sm">🏢 Publisher: {book.publisher}</p>
      <p className="text-gray-600 text-sm">🏷 Genre: {book.genre}</p>

      <p className="text-gray-800 font-medium">
        📦 Available / Total: {avail} / {book.copies}
      </p>

      <button
        className={`mt-3 px-4 py-2 text-white rounded ${
          avail > 0 ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'
        }`}
        disabled={avail <= 0}
        onClick={() => onBorrow(book)}
      >
        {avail > 0 ? 'Borrow' : 'Out of stock'}
      </button>
    </div>
  );
}
