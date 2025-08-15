import React from 'react';
import { FaRegCalendarAlt } from 'react-icons/fa';

export default function CalendarButton({ onClick, activeCount, overdueCount, nextDueLabel }) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-2 text-gray-700 hover:text-indigo-700 transition"
      title={nextDueLabel || 'No active borrows'}
    >
      <FaRegCalendarAlt className="text-xl" />
      {nextDueLabel && <span className="text-sm">{nextDueLabel}</span>}
      {(activeCount > 0 || overdueCount > 0) && (
        <span
          className={`absolute -top-2 -right-2 text-xs px-1.5 py-0.5 rounded-full text-white ${
            overdueCount > 0 ? 'bg-red-600' : 'bg-indigo-600'
          }`}
        >
          {overdueCount > 0 ? `${overdueCount}!` : activeCount}
        </span>
      )}
    </button>
  );
}
