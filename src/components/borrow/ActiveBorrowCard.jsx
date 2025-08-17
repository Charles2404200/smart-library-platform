import React from 'react';

function fmt(d) {
  return d ? new Date(d).toLocaleString() : '—';
}

function computeOverdue(row) {
  // server says it's overdue
  const serverOverdue =
    row.overdue === true ||
    row.overdue === 1 ||
    row.overdue === '1';

  // client check: dueAt passed and not yet returned, and local time beyond dueAt
  const clientOverdue =
    !!row.dueAt && !row.returnAt && Date.now() > new Date(row.dueAt).getTime();

  return serverOverdue || clientOverdue;
}


function DueBadge({ row }) {
  const overdue = computeOverdue(row);
  if (overdue) {
    return (
      <span className="ml-2 inline-block text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded">
        Overdue
      </span>
    );
  }
  if (!row.dueAt || row.returnAt) return null;

  const msLeft = new Date(row.dueAt).getTime() - Date.now();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  const label = daysLeft > 1 ? `${daysLeft} days left` : daysLeft === 1 ? '1 day left' : 'Due today';

  return (
    <span className="ml-2 inline-block text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
      {label}
    </span>
  );
}

export default function ActiveBorrowCard({ row, onReturn }) {
  const id = row.checkoutId || row.id;
  const overdue = computeOverdue(row);

  return (
    <div
      className={`border rounded-lg bg-white shadow p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
        overdue ? 'border-red-300' : 'border-gray-200'
      }`}
    >
      <div>
        <div className="font-semibold text-indigo-700">
          {row.title || 'Untitled'} <DueBadge row={row} />
        </div>
        <div className="text-sm text-gray-600">
          Borrowed: <span className="font-medium">{fmt(row.checkoutAt)}</span>
        </div>
        <div className="text-sm text-gray-600">
          Due: <span className="font-medium">{fmt(row.dueAt)}</span>
        </div>
        {overdue && (
          <div className="text-sm mt-1 text-red-600">
            ⚠ This item is overdue. Please return it as soon as possible.
          </div>
        )}
      </div>
      <div className="shrink-0">
        <button
          onClick={() => onReturn(id)}
          className="px-4 py-2 rounded text-white bg-emerald-600 hover:bg-emerald-700"
          title="Mark as returned"
        >
          Return now
        </button>
      </div>
    </div>
  );
}
