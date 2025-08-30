import React from 'react';

/**
 * BorrowModal
 *
 * Props:
 *  - open: boolean
 *  - book: object (book currently selected)
 *  - borrowAt: string | null  (ISO date or '' expected)
 *  - dueAt: string | null
 *  - setBorrowAt: function
 *  - setDueAt: function
 *  - onClose: function
 *  - onSubmit: function  (called when user confirms borrow; parent handles the actual API call)
 *  - status: string | null (status messages to display)
*/
export default function BorrowModal({
  open,
  book,
  borrowAt,
  dueAt,
  setBorrowAt,
  setDueAt,
  onClose,
  onSubmit,
  status,
}) {
  if (!open || !book) return null;

  // Ensure controlled input values are strings (never `null`)
  const borrowVal = borrowAt ?? '';
  const dueVal = dueAt ?? '';

  const handleSubmit = (e) => {
    e.preventDefault();
    // Basic validation: ensure dates present (you can add more rules if desired)
    if (!borrowVal || !dueVal) {
    
      return onSubmit && onSubmit();
    }
    return onSubmit && onSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black opacity-40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-xl w-full bg-white rounded shadow-lg p-6">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold">Borrow "{book.title}"</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Borrow date
            </label>
            <input
              type="date"
              value={borrowVal}
              onChange={(e) => setBorrowAt(e.target.value)}
              className="mt-1 block w-full rounded border px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Due date
            </label>
            <input
              type="date"
              value={dueVal}
              onChange={(e) => setDueAt(e.target.value)}
              className="mt-1 block w-full rounded border px-3 py-2"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Confirm Borrow
            </button>
          </div>
        </form>

        {status && (
          <div className="mt-3 p-2 text-sm bg-yellow-50 border border-yellow-300 rounded text-yellow-800">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
