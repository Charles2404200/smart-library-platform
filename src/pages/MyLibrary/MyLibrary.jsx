// src/pages/MyLibrary/MyLibrary.jsx
import React, { useEffect, useState } from 'react';
import { getMyBorrows } from '../../services/borrowService';
import { useNavigate } from 'react-router-dom';

export default function MyLibrary() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getMyBorrows();
        setBooks(Array.isArray(data) ? data : data.borrows || []);
      } catch (err) {
        console.error('Failed to fetch borrowed books:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <p className="p-6 text-gray-600">Loading your library…</p>;

  if (books.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-indigo-700 mb-4">📖 My Library</h1>
        <p className="text-gray-600">You haven’t borrowed any books yet.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-indigo-700 mb-4">📖 My Library</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {books.map((book) => (
          <div key={book.checkoutId} className="border rounded-lg bg-white shadow p-4">
            <h2 className="text-lg font-semibold">{book.title}</h2>
            <p className="text-sm text-gray-600 mb-2">
              Borrowed: {new Date(book.checkoutAt).toLocaleDateString()}
            </p>
            <button
              onClick={() => navigate(`/read/${book.book_id}`)}
              className="mt-2 px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Read Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
