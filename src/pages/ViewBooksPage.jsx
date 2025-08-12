import React, { useEffect, useState } from 'react';

export default function ViewBooksPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [borrowStatus, setBorrowStatus] = useState(null);

  const fetchBooks = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/books', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setBooks(data);
      } else {
        setBooks([]);
      }
    } catch (err) {
      console.error('❌ Error fetching books:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleBorrow = async (bookId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return alert('Please log in to borrow a book.');

      const res = await fetch('http://localhost:4000/api/borrow/borrow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookId }),
      });

      const result = await res.json();
      if (res.ok) {
        setBorrowStatus(`✅ Borrowed book ID ${bookId} successfully`);
        fetchBooks();
      } else {
        setBorrowStatus(`❌ Failed to borrow: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('❌ Borrow error:', err);
      setBorrowStatus('❌ Borrow failed');
    }
  };

  const handleReturn = async (checkoutId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return alert('Please log in to return a book.');

      const res = await fetch('http://localhost:4000/api/borrow/return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ checkoutId }),
      });

      const result = await res.json();
      if (res.ok) {
        setBorrowStatus(`✅ Returned book successfully`);
        fetchBooks();
      } else {
        setBorrowStatus(`❌ Failed to return: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('❌ Return error:', err);
      setBorrowStatus('❌ Return failed');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-indigo-700">📖 All Available Books</h1>

      {borrowStatus && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded text-yellow-800">
          {borrowStatus}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading books...</p>
      ) : books.length === 0 ? (
        <p className="text-red-500">No books available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {books.map((book) => (
            <div
              key={book.id}
              className="bg-white p-4 border rounded-lg shadow hover:shadow-md transition"
            >
              <h2 className="text-xl font-semibold text-indigo-600">{book.title}</h2>
              <p className="text-gray-700 mb-1">📚 Author(s): {book.authors}</p>
              <p className="text-gray-600 text-sm">🏢 Publisher: {book.publisher}</p>
              <p className="text-gray-600 text-sm">🏷 Genre: {book.genre}</p>
              <p className="text-gray-600 text-sm">📦 Copies: {book.copies}</p>

              {book.borrowed ? (
                <button
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  onClick={() => handleReturn(book.checkoutId)}
                >
                  Return
                </button>
              ) : (
                <button
                  className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  onClick={() => handleBorrow(book.id)}
                >
                  Borrow
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
