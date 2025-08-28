import React from 'react';

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-2">Borrow “{book.title}”</h3>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Borrow at</label>
            <input
              type="datetime-local"
              className="border rounded p-2 w-full"
              value={borrowAt}
              onChange={(e) => setBorrowAt(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Return due</label>
            <input
              type="datetime-local"
              className="border rounded p-2 w-full"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              We’ll warn you if the due date passes before you return it.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="px-4 py-2 rounded border" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white">
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
