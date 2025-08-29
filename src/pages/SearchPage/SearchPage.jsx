// src/pages/SearchPage/SearchPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import useSearch from '../../hooks/useSearch';
import SearchForm from '../../components/search/SearchForm';
import SearchResults from '../../components/search/SearchResults';
import { searchBooksAdvanced, getAvailability } from '../../services/booksService';
import { borrowBook } from '../../services/borrowService';

const DEFAULT_LOAN_DAYS = 14;

function formatDateISO(d) {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// --- Auth from localStorage (raw or JSON-wrapped token) ---
const tokenRaw = localStorage.getItem('token');
let token = null;
try {
  const parsed = JSON.parse(tokenRaw);
  token = typeof parsed === 'string' ? parsed : (parsed && parsed.token) ? parsed.token : tokenRaw;
} catch {
  token = tokenRaw;
}
const isAuthenticated = !!token;

let currentUser = null;
if (isAuthenticated && typeof token === 'string' && token.includes('.')) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    currentUser = payload?.user ?? payload ?? null;
  } catch {}
}

export default function SearchPage() {
  const {
    filters,
    setFilters,
    books,
    setBooks,
    loading,
    setLoading,
    hydrateAggregates,
    borrowStatus,
    setBorrowStatus,
  } = useSearch();

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(24);
  const [total, setTotal] = useState(0);

  // Borrow modal
  const [borrowOpen, setBorrowOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [borrowAt, setBorrowAt] = useState(null);
  const [dueAt, setDueAt] = useState(null);

  // Reviews modal
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewBook, setReviewBook] = useState(null);

  const runSearch = useCallback(async (nextPage = page) => {
    const setBusy = typeof setLoading === 'function' ? setLoading : () => {};
    setBusy(true);
    try {
      const res = await searchBooksAdvanced({ ...filters, page: nextPage, pageSize });
      const rows =
        Array.isArray(res?.data) ? res.data :
        Array.isArray(res) ? res :
        res?.rows ?? res?.items ?? [];
      const totalCount = Number(res?.total ?? res?.count ?? 0);

      setBooks(rows);
      setTotal(totalCount);

      if (typeof hydrateAggregates === 'function') {
        try { await hydrateAggregates(rows); } catch {}
      }
    } catch (e) {
      console.error('Search failed', e);
    } finally {
      setBusy(false);
    }
  }, [filters, page, pageSize, setBooks, setLoading, hydrateAggregates]);

  useEffect(() => {
    // Only refetch on page change if user has searched at least once
    const hasAnyFilter = Object.values(filters || {}).some(v => (v ?? '').toString().trim() !== '');
    if (hasAnyFilter) runSearch(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Borrow
  const openBorrowModal = (book) => {
    setSelectedBook(book);
    const today = new Date();
    setBorrowAt(formatDateISO(today));
    setDueAt(formatDateISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() + DEFAULT_LOAN_DAYS)));
    setBorrowOpen(true);
  };
  const closeBorrowModal = () => {
    setBorrowOpen(false);
    setSelectedBook(null);
    setBorrowAt(null);
    setDueAt(null);
  };
  const handleBorrowSubmit = async () => {
    if (!selectedBook) return;
    try {
      await borrowBook({
        book_id: Number(selectedBook.id ?? selectedBook.book_id),
        borrow_at: borrowAt,
        due_at: dueAt,
      });
      setBorrowStatus(`✅ Borrowed "${selectedBook.title}" successfully`);

      const selId = Number(selectedBook.id ?? selectedBook.book_id);
      try {
        const fresh = await getAvailability(selId);
        setBooks((prev) =>
          prev.map((b) => {
            const id = Number(b.id ?? b.book_id);
            return id === selId ? { ...b, copies: typeof fresh === 'number' ? fresh : b.copies } : b;
          })
        );
      } catch {}
    } catch (err) {
      setBorrowStatus(typeof err?.message === 'string' ? err.message : 'Borrow failed');
    } finally {
      setTimeout(() => {
        setBorrowOpen(false);
        setSelectedBook(null);
        setBorrowAt(null);
        setDueAt(null);
      }, 600);
    }
  };

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
      <SearchForm
        filters={filters}
        setFilters={setFilters}
        onSearch={() => { setPage(1); runSearch(1); }}
        onClear={() => {
          setFilters({ title: '', author: '', genre: '', publisher: '' });
          setBooks([]);
          setTotal(0);
          setPage(1);
        }}
      />

      <SearchResults
        books={books}
        loading={loading}
        onBorrow={openBorrowModal}
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
        setBorrowAt={setBorrowAt}
        dueAt={dueAt}
        setDueAt={setDueAt}
        onClose={closeBorrowModal}
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
