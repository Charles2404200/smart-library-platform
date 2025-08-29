// src/components/reviews/ReviewList.jsx
import React from 'react';
import ReviewStars from './ReviewStars';

export default function ReviewList({ avgRating = 0, count = 0, reviews = [], onDelete, currentUser }) {
  const avgDisplay = typeof avgRating === 'number' ? (Math.round(avgRating * 10) / 10).toFixed(1) : String(avgRating);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ReviewStars value={Math.round(avgRating)} readOnly />
        <div className="text-sm text-gray-700">
          <span className="font-semibold">{avgDisplay}/5</span> · {count} review{count === 1 ? '' : 's'}
        </div>
      </div>

      {reviews.length === 0 ? (
        <p className="text-gray-500">No reviews yet.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => {
            const isOwner = currentUser && (Number(currentUser.id) === Number(r.userId) || Number(currentUser.user_id) === Number(r.userId));
            return (
              <li key={r.id} className="border rounded p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-semibold">{r.userName || r.user_name || 'Anonymous'}</div>
                    <div className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <ReviewStars value={Number(r.rating) || 0} readOnly size="text-base" />
                    <div className="text-sm text-gray-700">{r.rating}/5</div>
                  </div>
                </div>
                <div className="mt-2 text-gray-800">{r.comment}</div>
                {isOwner && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => onDelete?.(r.id)}
                      className="mt-2 text-xs px-2 py-1 border rounded hover:bg-gray-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
