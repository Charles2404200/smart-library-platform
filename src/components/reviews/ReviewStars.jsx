// src/components/reviews/ReviewStars.jsx
import React from 'react';

export default function ReviewStars({ value = 0, onChange, size = 'text-xl', readOnly = false }) {
  const stars = [1,2,3,4,5];
  return (
    <div className={`inline-flex items-center gap-1 ${readOnly ? 'opacity-90' : ''}`}>
      {stars.map(n => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star`}
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          className={`${size} ${readOnly ? 'cursor-default' : 'hover:scale-105'} transition`}
        >
          {n <= value ? '★' : '☆'}
        </button>
      ))}
    </div>
  );
}
