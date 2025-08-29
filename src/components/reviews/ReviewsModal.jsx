// src/components/reviews/ReviewsModal.jsx
import React, { useEffect, useState } from 'react';
import { ReviewsAPI } from '../../services/reviews';
import ReviewList from './ReviewList';
import ReviewForm from './ReviewForm';

/**
 * ReviewsModal
 *
 * Props:
 *  - open (bool)
 *  - onClose () => void
 *  - book (object) - expects book.id or book.book_id
 *  - currentUser (object)
 *  - isAuthenticated (bool)
 *  - onAggregates (bookId, avg, count) => void  (optional) - called after successful create/delete to update parent aggregates
 */
export default function ReviewsModal({
  open,
  onClose,
  book,
  currentUser,
  isAuthenticated,
  onAggregates = () => {},
}) {
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [error, setError] = useState(null);

  const bookId = book?.id ?? book?.book_id ?? null;

  useEffect(() => {
    if (!open) return;
    if (!bookId) {
      setReviews([]);
      setAvg(0);
      setCount(0);
      return;
    }

    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await ReviewsAPI.list(Number(bookId));
        // server may return array or object { reviews: [], avgRating, count }
        let rows = [];
        let avgRating = 0;
        let cnt = 0;
        if (Array.isArray(res)) {
          rows = res;
          cnt = rows.length;
          avgRating = rows.reduce((s, r) => s + (Number(r.rating) || 0), 0) / (rows.length || 1);
        } else if (res && typeof res === 'object') {
          rows = res.reviews ?? res.data ?? res.rows ?? [];
          avgRating = Number(res.avgRating ?? res.averageRating ?? res.avg_rating ?? 0);
          cnt = Number(res.count ?? res.total ?? rows.length ?? 0);
        }
        if (!mounted) return;
        setReviews(rows);
        setAvg(Number.isFinite(avgRating) ? avgRating : 0);
        setCount(Number.isFinite(cnt) ? cnt : 0);
      } catch (e) {
        console.error('Failed to load reviews', e);
        if (!mounted) return;
        setError(e?.message ?? 'Failed to load reviews');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [open, bookId]);

  async function refreshList() {
    if (!bookId) return;
    setLoading(true);
    try {
      const res = await ReviewsAPI.list(Number(bookId));
      let rows = [];
      let avgRating = 0;
      let cnt = 0;
      if (Array.isArray(res)) {
        rows = res;
        cnt = rows.length;
        avgRating = rows.reduce((s, r) => s + (Number(r.rating) || 0), 0) / (rows.length || 1);
      } else if (res && typeof res === 'object') {
        rows = res.reviews ?? res.data ?? res.rows ?? [];
        avgRating = Number(res.avgRating ?? res.averageRating ?? res.avg_rating ?? 0);
        cnt = Number(res.count ?? res.total ?? rows.length ?? 0);
      }
      setReviews(rows);
      setAvg(Number.isFinite(avgRating) ? avgRating : 0);
      setCount(Number.isFinite(cnt) ? cnt : 0);
      // propagate aggregates upward
      onAggregates(bookId, Number.isFinite(avgRating) ? avgRating : 0, Number.isFinite(cnt) ? cnt : 0);
    } catch (e) {
      console.error('refreshList error', e);
      setError(e?.message ?? 'Failed to refresh reviews');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate({ rating, comment }) {
    if (!bookId) return alert('Book is missing');
    setLoading(true);
    try {
      const payload = { bookId: Number(bookId), rating: Number(rating), comment: comment ?? '' };
      const res = await ReviewsAPI.create(payload);
      // server may return created review or aggregates; refresh to be safe
      await refreshList();
      return res;
    } catch (e) {
      console.error('create review failed', e);
      alert(e?.message ?? 'Failed to submit review');
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(reviewId) {
    if (!reviewId) return;
    if (!confirm('Delete this review?')) return;
    setLoading(true);
    try {
      await ReviewsAPI.remove(reviewId);
      await refreshList();
    } catch (e) {
      console.error('delete review failed', e);
      alert(e?.message ?? 'Failed to delete review');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl shadow-lg p-4">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold">Reviews</h2>
          <div>
            <button onClick={onClose} className="text-sm px-2 py-1 rounded border">Close</button>
          </div>
        </div>

        <div className="mt-4">
          {loading && <div className="text-sm text-gray-600">Loading reviews…</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}

          <ReviewList
            avgRating={avg}
            count={count}
            reviews={reviews}
            onDelete={handleDelete}
            currentUser={currentUser}
          />

          <div className="mt-5 border-t pt-4">
            {isAuthenticated ? (
              <ReviewForm onSubmit={handleCreate} />
            ) : (
              <div className="text-sm text-gray-600">Please log in to leave a review.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
