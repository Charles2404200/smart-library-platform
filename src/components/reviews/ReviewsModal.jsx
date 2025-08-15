// src/components/reviews/ReviewsModal.jsx
import React, { useEffect, useState } from 'react';
import { ReviewsAPI } from '../../services/reviews';
import ReviewList from './ReviewList';
import ReviewForm from './ReviewForm';

export default function ReviewsModal({
  open,
  onClose,
  book,
  currentUser,
  isAuthenticated,
  onAggregates, // <- (bookId, avg, count) => void
}) {
  const [loading, setLoading] = useState(false);
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [reviews, setReviews] = useState([]);

  const bookId = book?.id || book?.book_id;

  function pushToParent(nextAvg, nextCount) {
    if (!bookId) return;
    if (typeof onAggregates === 'function') {
      onAggregates(bookId, Number(nextAvg || 0), Number(nextCount || 0));
    }
  }

  async function load() {
    if (!bookId) return;
    setLoading(true);
    try {
      const data = await ReviewsAPI.list(bookId);
      const nextAvg = Number(data?.avgRating || 0);
      const nextCount = Number(data?.count || 0);
      setAvg(nextAvg);
      setCount(nextCount);
      setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
      // keep card in sync whenever modal loads
      pushToParent(nextAvg, nextCount);
    } catch (e) {
      console.error('load reviews', e);
      setAvg(0); setCount(0); setReviews([]);
      pushToParent(0, 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (open) load(); }, [open, bookId]);

  const handleCreate = async ({ rating, comment }) => {
    if (!isAuthenticated) return alert('Please log in to leave a review.');
    try {
      const res = await ReviewsAPI.create(
        { bookId, rating: Number(rating), comment: comment?.trim() || '' },
        { token: localStorage.getItem('token') } // ✅ token goes in the 2nd arg
      );
      // server returns { avgRating, count } — push to card immediately
      if (res && typeof res.avgRating !== 'undefined' && typeof res.count !== 'undefined') {
        pushToParent(res.avgRating, res.count);
      }
      await load(); // refresh list + summary
    } catch (e) {
      alert(e.message || 'Failed to submit review');
    }
  };

  const handleDelete = async (id) => {
    try {
      await ReviewsAPI.delete(id, { token: localStorage.getItem('token') });
      await load(); // will push new avg/count via load()
    } catch (e) {
      alert(e.message || 'Failed to delete review');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-5 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Reviews — {book?.title}</h3>
          <button className="px-3 py-1 border rounded hover:bg-gray-50" onClick={onClose}>Close</button>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <ReviewList
            avgRating={avg}
            count={count}
            reviews={reviews}
            currentUser={currentUser}
            onDelete={handleDelete}
          />
        )}

        <div className="mt-5 border-t pt-4">
          {isAuthenticated ? (
            <ReviewForm onSubmit={handleCreate} />
          ) : (
            <div className="text-sm text-gray-600">Please log in to leave a review.</div>
          )}
        </div>
      </div>
    </div>
  );
}
