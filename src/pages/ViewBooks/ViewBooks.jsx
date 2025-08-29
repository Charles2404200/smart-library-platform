// src/pages/ViewBooks/ViewBooks.jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getBooks, searchBooks as searchBooksAPI, getAvailability } from '../../services/booksService';
import { borrowBook } from '../../services/borrowService';
import BooksGrid from '../../components/books/BooksGrid';
import BorrowModal from '../../components/books/BorrowModal';
import ReviewsModal from '../../components/reviews/ReviewsModal';

const DEFAULT_LOAN_DAYS = 14;

function formatDateISO(d) {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// --- Auth from localStorage ---
const tokenRaw = localStorage.getItem('token');
let token = null;
try {
  const parsed = JSON.parse(tokenRaw);
  token = typeof parsed === 'string' ? parsed : (parsed && parsed.token) ? parsed.token : tokenRaw;
} catch { token = tokenRaw; }
const isAuthenticated = !!token;
let currentUser = null;
if (isAuthenticated && typeof token === 'string' && token.includes('.')) {
  try { const payload = JSON.parse(atob(token.split('.')[1])); currentUser = payload?.user ?? payload ?? null; } catch {}
}

export default function ViewBooksPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(24);
  const [total, setTotal] = useState(0);

  // Borrow
  const [borrowOpen, setBorrowOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [borrowAt, setBorrowAt] = useState(null);
  const [dueAt, setDueAt] = useState(null);
  const [borrowStatus, setBorrowStatus] = useState(null);

  // Reviews
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewBook, setReviewBook] = useState(null);

  // Initial list (first page)
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await getBooks({ page: 1, pageSize });
        const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : res?.rows ?? res?.items ?? [];
        const totalCount = Number(res?.total ?? res?.count ?? 0);
        if (!mounted) return;
        setBooks(rows);
        setTotal(totalCount);
        setPage(1);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message ?? 'Failed to load books');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [pageSize]);

  // Fetch when q or page changes
  useEffect(() => {
    let mounted = true;
    (async () => {
      setSearching(true);
      try {
        const res = q
          ? await searchBooksAPI({ q, page, pageSize })
          : await getBooks({ page, pageSize });

        const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : res?.rows ?? res?.items ?? [];
        const totalCount = Number(res?.total ?? res?.count ?? 0);
        if (!mounted) return;
        setBooks(rows);
        setTotal(totalCount);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message ?? (q ? 'Search failed' : 'Failed to load books'));
      } finally {
        if (!mounted) return;
        setSearching(false);
      }
    })();
    return () => { mounted = false; };
  }, [q, page, pageSize]);

  // Borrow helpers
  const openBorrow = (book) => {
    setSelectedBook(book);
    const today = new Date();
    setBorrowAt(formatDateISO(today));
    setDueAt(formatDateISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() + DEFAULT_LOAN_DAYS)));
    setBorrowOpen(true);
  };
  const closeBorrow = () => { setBorrowOpen(false); setSelectedBook(null); setBorrowAt(null); setDueAt(null); };
  async function handleBorrowSubmit() {
    if (!selectedBook) { setBorrowStatus('No book selected'); return; }
    setBorrowStatus('Saving...');
    try {
      await borrowBook({ bookId: selectedBook.id ?? selectedBook.book_id, borrowAt, dueAt });
      setBorrowStatus('Borrow successful');
      try {
        const fresh = await getAvailability(Number(selectedBook.id ?? selectedBook.book_id));
        setBooks((prev) =>
          prev.map((b) => {
            const id = b.id ?? b.book_id;
            return Number(id) === Number(selectedBook.id ?? selectedBook.book_id)
              ? { ...b, copies: typeof fresh === 'number' ? fresh : b.copies }
              : b;
          })
        );
      } catch {}
    } catch (e) {
      setBorrowStatus(e?.message ?? 'Borrow failed');
    } finally {
      setTimeout(() => { setBorrowOpen(false); setSelectedBook(null); setBorrowAt(null); setDueAt(null); }, 600);
    }
  }

  // Reviews
  const openReviews = (book) => { setReviewBook(book); setReviewOpen(true); };
  const closeReviews = () => { setReviewOpen(false); setReviewBook(null); };
  const handleAggregates = (bookId, avg, count) => {
    setBooks((prev) =>
      prev.map((b) => {
        const id = Number(b.id ?? b.book_id);
        return id === Number(bookId)
          ? { ...b, avg_rating: Number(avg || 0), reviews_count: Number(count || 0) }
          : b;
      })
    );
  };

  return (
    <div className="p-4">
      {loading && <p className="text-gray-600">Loading books...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <BooksGrid
        books={books}
        loading={loading || searching}
        onBorrow={openBorrow}
        onReviews={openReviews}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
      />

      <BorrowModal
        open={borrowOpen}
        book={selectedBook}
        borrowAt={borrowAt}
        dueAt={dueAt}
        setBorrowAt={setBorrowAt}
        setDueAt={setDueAt}
        onClose={closeBorrow}
        onSubmit={handleBorrowSubmit}
        status={borrowStatus}
      />

      <ReviewsModal
        open={reviewOpen}
        onClose={closeReviews}
        book={reviewBook}
        isAuthenticated={isAuthenticated}
        currentUser={currentUser}
        onAggregates={handleAggregates}
      />
    </div>
  );
}
