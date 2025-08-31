// src/pages/SearchPage/SearchPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import useSearch from '../../hooks/useSearch';
import SearchForm from '../../components/search/SearchForm';
import SearchResults from '../../components/search/SearchResults';
import { searchBooksAdvanced, getAvailability } from '../../services/booksService';
import { borrowBook } from '../../services/borrowService';
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

export default function SearchPage() {
  // --- Auth from localStorage (guarded for browser) ---
  const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  const tokenRaw = isBrowser ? localStorage.getItem('token') : null;

  let token = null;
  if (tokenRaw) {
    try {
      const parsed = JSON.parse(tokenRaw);
      token = typeof parsed === 'string' ? parsed : (parsed && parsed.token) ? parsed.token : tokenRaw;
    } catch {
      token = tokenRaw;
    }
  }
  const isAuthenticated = !!token;

  let currentUser = null;
  if (isAuthenticated && typeof token === 'string' && token.includes('.')) {
    try {
      // Note: base64url-safe decode
      const base64url = token.split('.')[1];
      const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      currentUser = payload?.user ?? payload ?? null;
    } catch {
      /* ignore bad/opaque token */
    }
  }

  const hook = useSearch();
  // Use whatever the hook provides, but be robust to name differences
  const filters = hook?.filters ?? { title: '', author: '', genre: '', publisher: '' };
  const setFilters = hook?.setFilters ?? (() => {});
  const hookBooks = hook?.books;          // some versions
  const hookSetBooks = hook?.setBooks;
  const hookResults = hook?.results;      // other versions
  const hookSetResults = hook?.setResults;

  // Fallback local state so we never crash if the hook doesn’t expose setters
  const [localBooks, setLocalBooks] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);

  // Normalized dataset + setter
  const dataset = hookBooks ?? hookResults ?? localBooks;
  const setDataset = hookSetBooks || hookSetResults || ((val) => {
    if (typeof val === 'function') setLocalBooks((prev) => val(prev));
    else setLocalBooks(val);
  });

  const loading = !!(hook?.loading ?? localLoading);
  const setLoading = hook?.setLoading ?? setLocalLoading;

  const hydrateAggregates = typeof hook?.hydrateAggregates === 'function' ? hook.hydrateAggregates : async () => {};
  const borrowStatus = hook?.borrowStatus ?? null;
  const setBorrowStatus = hook?.setBorrowStatus ?? (() => {});

  // Pagination (client view)
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
    setLoading(true);
    try {
      const res = await searchBooksAdvanced({ ...filters, page: nextPage, pageSize });

      // Normalize rows from any API/service shape
      const rows =
        Array.isArray(res?.data) ? res.data :
        Array.isArray(res) ? res :
        res?.rows ?? res?.items ?? [];

      const totalCount = Number(res?.total ?? res?.count ?? 0);

      setDataset(rows);
      setTotal(totalCount);

      try { await hydrateAggregates(rows); } catch { /* non-critical */ }
    } catch (e) {
      console.error('Search failed', e);
      // Keep dataset but clear count to avoid misleading pager
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize, setDataset, setLoading, hydrateAggregates]);

  // Refetch when page changes after a search has been initiated
  useEffect(() => {
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

      // refresh availability for this title
      const selId = Number(selectedBook.id ?? selectedBook.book_id);
      try {
        const fresh = await getAvailability(selId);
        setDataset((prev) =>
          (prev || []).map((b) => {
            const id = Number(b.id ?? b.book_id);
            return id === selId ? { ...b, copies: typeof fresh === 'number' ? fresh : b.copies } : b;
          })
        );
      } catch { /* non-critical */ }
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
    setDataset((prev) =>
      (prev || []).map((b) => {
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
          setDataset([]);
          setTotal(0);
          setPage(1);
        }}
        loading={loading}
      />

      <SearchResults
        books={Array.isArray(dataset) ? dataset : []}
        loading={loading}
        onBorrow={openBorrowModal}
        onReviews={openReviews}
        page={page}
        pageSize={pageSize}
        total={total}
        
      />

      {/* These must be defined (imported) even if open={false} */}
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
