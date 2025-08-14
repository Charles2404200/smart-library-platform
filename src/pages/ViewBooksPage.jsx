import React, { useEffect, useState } from 'react';

export default function ViewBooksPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [borrowStatus, setBorrowStatus] = useState(null);

  // modal state
  const [borrowModalOpen, setBorrowModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [borrowAt, setBorrowAt] = useState('');
  const [dueAt, setDueAt] = useState('');

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

  // open modal with sensible defaults (today, +14 days)
  const openBorrowModal = (book) => {
    const today = new Date();
    const plus14 = new Date();
    plus14.setDate(today.getDate() + 14);

    const fmt = (d) => d.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm" for datetime-local

    setSelectedBook(book);
    setBorrowAt(fmt(today));
    setDueAt(fmt(plus14));
    setBorrowModalOpen(true);
  };

  const closeBorrowModal = () => {
    setBorrowModalOpen(false);
    setSelectedBook(null);
    setBorrowStatus(null);
  };

  const handleBorrowSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBook) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return alert('Please log in to borrow a book.');

      // guard: due must be after borrow
      if (new Date(dueAt) <= new Date(borrowAt)) {
        return alert('Due date must be after the borrow date/time.');
      }

      const res = await fetch('http://localhost:4000/api/borrow/borrow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookId: selectedBook.id,
          borrowAt,         // ISO string (from <input type="datetime-local">)
          dueAt,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        setBorrowStatus(`✅ Borrowed "${selectedBook.title}" successfully`);
        const returnedId =
          result.book_id ?? result.bookId ?? result?.updated?.book_id ?? result?.updated?.bookId;
        const returnedAvail =
          result.available_copies ?? result?.updated?.available_copies;

        if (returnedId && typeof returnedAvail === 'number') {
          setBooks(prev =>
            prev.map(b => (b.id === returnedId ? { ...b, available_copies: returnedAvail } : b))
          );
        } else {
          setBooks(prev =>
            prev.map(b =>
              b.id === selectedBook.id
                ? { ...b, available_copies: Math.max(0, (b.available_copies ?? b.copies) - 1) }
                : b
            )
          );
        }

        // warn immediately if user somehow picked a past due date
        if (new Date(dueAt) < new Date()) {
          alert('⚠️ Warning: your selected due date is already in the past!');
        }

        setTimeout(() => {
          closeBorrowModal();
          fetchBooks(); // final sync
        }, 600);
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
            const avail = book.available_copies ?? book.copies;
            return (
              <div
                key={book.id}
                className="bg-white p-4 border rounded-lg shadow hover:shadow-md transition"
              >
                {book.image_url && (
                  <img
                    src={`http://localhost:4000${book.image_url}`}
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
                  onClick={() => openBorrowModal(book)}
                >
                  {avail > 0 ? 'Borrow' : 'Out of stock'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Borrow modal */}
      {borrowModalOpen && selectedBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Borrow “{selectedBook.title}”</h3>

            <form onSubmit={handleBorrowSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Borrow at
                </label>
                <input
                  type="datetime-local"
                  className="border rounded p-2 w-full"
                  value={borrowAt}
                  onChange={(e) => setBorrowAt(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Return due
                </label>
                <input
                  type="datetime-local"
                  className="border rounded p-2 w-full"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  We’ll warn you if the due date passes before you return it.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded border"
                  onClick={closeBorrowModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Confirm Borrow
                </button>
              </div>
            </form>

            {borrowStatus && (
              <div className="mt-3 p-2 text-sm bg-yellow-50 border border-yellow-300 rounded text-yellow-800">
                {borrowStatus}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
