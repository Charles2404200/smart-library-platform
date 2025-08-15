import React, { useEffect, useMemo, useState } from 'react';
import { getBooks } from '../../services/booksService';
import { borrowBook } from '../../services/borrowService';
import BooksGrid from '../../components/books/BooksGrid';
import BorrowModal from '../../components/books/BorrowModal';
import { API_URL } from '../../config/env';

export default function ViewBooksPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [borrowStatus, setBorrowStatus] = useState(null);

  // modal state
  const [borrowModalOpen, setBorrowModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [borrowAt, setBorrowAt] = useState('');
  const [dueAt, setDueAt] = useState('');

  // --- load books
  async function loadBooks() {
    setLoading(true);
    try {
      const data = await getBooks();
      const rows = Array.isArray(data) ? data : data.books || [];

      // Prefill image URL with API_URL when backend returns '/uploads/...'
      const normalized = rows.map((b) => ({
        ...b,
        full_image_url: b?.image_url
          ? b.image_url.startsWith('http')
            ? b.image_url
            : `${API_URL}${b.image_url.startsWith('/') ? '' : '/'}${b.image_url}`
          : undefined,
      }));

      setBooks(normalized);
    } catch (err) {
      console.error('❌ Error fetching books:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBooks(); }, []);

  // open modal with sensible defaults (today, +14 days)
  const openBorrowModal = (book) => {
    const now = new Date();
    const plus14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const fmt = (d) => {
      const z = new Date(d);
      const iso = new Date(z.getTime() - z.getTimezoneOffset() * 60000).toISOString();
      return iso.slice(0, 16); // "YYYY-MM-DDTHH:mm" for datetime-local in local TZ
    };

    setSelectedBook(book);
    setBorrowAt(fmt(now));
    setDueAt(fmt(plus14));
    setBorrowModalOpen(true);
    setBorrowStatus(null);
  };

  const closeBorrowModal = () => {
    setBorrowModalOpen(false);
    setSelectedBook(null);
    setBorrowStatus(null);
  };

  async function handleBorrowSubmit(e) {
    e.preventDefault();
    if (!selectedBook) return;

    const token = localStorage.getItem('token');
    if (!token) return alert('Please log in to borrow a book.');

    if (new Date(dueAt) <= new Date(borrowAt)) {
      return alert('Due date must be after the borrow date/time.');
    }

    try {
      const result = await borrowBook({
        bookId: selectedBook.id,
        borrowAt,
        dueAt,
      });

      setBorrowStatus(`✅ Borrowed "${selectedBook.title}" successfully`);

      const returnedId =
        result.book_id ?? result.bookId ?? result?.updated?.book_id ?? result?.updated?.bookId;
      const returnedAvail = result.available_copies ?? result?.updated?.available_copies;

      if (returnedId && typeof returnedAvail === 'number') {
        setBooks((prev) =>
          prev.map((b) => (b.id === returnedId ? { ...b, available_copies: returnedAvail } : b))
        );
      } else {
        // optimistic decrease
        setBooks((prev) =>
          prev.map((b) =>
            b.id === selectedBook.id
              ? { ...b, available_copies: Math.max(0, (b.available_copies ?? b.copies) - 1) }
              : b
          )
        );
      }

      // warn if user picked a past due date
      if (new Date(dueAt) < new Date()) {
        alert('⚠️ Warning: your selected due date is already in the past!');
      }

      setTimeout(() => {
        closeBorrowModal();
        loadBooks(); // sync final
      }, 600);
    } catch (err) {
      setBorrowStatus(`❌ Failed to borrow: ${err.message || 'Unknown error'}`);
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-indigo-700">📖 All Available Books</h1>

      {borrowStatus && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded text-yellow-800">
          {borrowStatus}
        </div>
      )}

      <BooksGrid books={books} loading={loading} onBorrow={openBorrowModal} />

      <BorrowModal
        open={borrowModalOpen}
        book={selectedBook}
        borrowAt={borrowAt}
        dueAt={dueAt}
        setBorrowAt={setBorrowAt}
        setDueAt={setDueAt}
        onClose={closeBorrowModal}
        onSubmit={handleBorrowSubmit}
        status={borrowStatus}
      />
    </div>
  );
}
