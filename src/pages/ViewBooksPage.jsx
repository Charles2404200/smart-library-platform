import React, { useEffect, useState } from 'react';

export default function ViewBooksPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [borrowStatus, setBorrowStatus] = useState(null);

  const asAbsolute = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `http://localhost:4000${url}`;
  };

  const fetchBooks = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/books');
      const data = await res.json();
      if (Array.isArray(data)) setBooks(data);
      else if (Array.isArray(data.books)) setBooks(data.books);
      else setBooks([]);
      setLoading(false);
    } catch (err) {
      console.error('❌ Error fetching books:', err);
      setLoading(false);
    }
  };

  useEffect(() => { fetchBooks(); }, []);

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

        // Prefer server numbers returned by the proc
        const returnedId =
          result.book_id ?? result.bookId ?? result?.updated?.book_id ?? result?.updated?.bookId;
        const returnedAvail =
          result.available_copies ?? result?.updated?.available_copies;

        if (returnedId && typeof returnedAvail === 'number') {
          setBooks(prev =>
            prev.map(b => (b.id === returnedId ? { ...b, available_copies: returnedAvail } : b))
          );
        } else {
          // Fallback optimistic decrement
          setBooks(prev =>
            prev.map(b =>
              b.id === bookId
                ? { ...b, available_copies: Math.max(0, (b.available_copies ?? b.copies) - 1) }
                : b
            )
          );
        }

        // Final sync from server in case others borrowed/returned meanwhile
        fetchBooks();
      } else {
        setBorrowStatus(`❌ Failed to borrow: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('❌ Borrow error:', err);
      setBorrowStatus('❌ Borrow failed');
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
          {books.map((book) => {
            const avail = book.available_copies ?? book.copies; // in case old rows miss the column
            const img = asAbsolute(book.image_url);
            return (
              <div
                key={book.id}
                className="bg-white p-4 border rounded-lg shadow hover:shadow-md transition"
              >
                {/* Cover image */}
                <div className="mb-3">
                  {img ? (
                    <img
                      src={img}
                      alt={book.title}
                      className="h-48 w-full object-cover rounded-md border"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  ) : (
                    <div className="h-48 w-full bg-gray-100 rounded-md border flex items-center justify-center text-gray-400">
                      No cover
                    </div>
                  )}
                </div>

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
                  onClick={() => handleBorrow(book.id)}
                >
                  {avail > 0 ? 'Borrow' : 'Out of stock'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
