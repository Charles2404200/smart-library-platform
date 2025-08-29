// src/components/reviews/ReviewList.jsx
import React from 'react';
import ReviewStars from './ReviewStars';

export default function ReviewList({ avgRating = 0, count = 0, reviews = [], onDelete, currentUser }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ReviewStars value={Math.round(avgRating)} readOnly />
        <div className="text-sm text-gray-700">
          <span className="font-semibold">{avgRating?.toFixed ? avgRating.toFixed(2) : avgRating}/5</span> · {count} review{count === 1 ? '' : 's'}
        </div>
      </div>

      {reviews.length === 0 ? (
        <p className="text-gray-500">No reviews yet.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => {
            const canDelete = currentUser && (currentUser.id === r.userId || ['staff','admin'].includes(currentUser.role));
            return (
              <li key={r.id} className="border rounded-lg p-3 bg-white">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-800">{r.userName || 'User #' + r.userId}</div>
                  <ReviewStars value={r.rating} readOnly size="text-base" />
                </div>
                {r.comment && <p className="text-gray-700 mt-1 whitespace-pre-wrap">{r.comment}</p>}
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(r.createdAt).toLocaleString()}
                </div>
                {canDelete && (
                  <button
                    onClick={() => onDelete?.(r.id)}
                    className="mt-2 text-xs px-2 py-1 border rounded hover:bg-gray-50"
                  >
                    Delete
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
