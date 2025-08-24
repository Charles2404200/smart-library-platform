// src/pages/MyLibrary/MyLibrary.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { getMyBorrows } from '../../services/borrowService';
import { useNavigate } from 'react-router-dom';

function getBookId(row) {
  // prefer camelCase from API, fallback to snake_case
  return row.bookId ?? row.book_id ?? null;
}

export default function MyLibrary() {
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const data = await getMyBorrows();
        const rows = Array.isArray(data) ? data : data.borrows || [];
        setBorrows(rows);
      } catch (err) {
        console.error('Failed to fetch borrowed books:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const active = useMemo(() => borrows.filter(b => !b.returnAt), [borrows]);

  const onRead = (row) => {
    const id = getBookId(row);
    if (!id) {
      console.warn('No bookId on row:', row);
      alert('Sorry, this item is missing its book id.');
      return;
    }
    navigate(`/read/${id}`);
  };

  if (loading) return <p className="p-6 text-gray-600">Loading your library…</p>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-indigo-700 mb-4">📖 My Library</h1>

      {active.length === 0 ? (
        <p className="text-gray-600">You have no active borrows right now.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((row) => (
            <div key={row.checkoutId || row.id} className="border rounded-lg bg-white shadow p-4">
              <h2 className="text-lg font-semibold">{row.title || 'Untitled'}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Borrowed: {row.checkoutAt ? new Date(row.checkoutAt).toLocaleDateString() : '—'}
              </p>
              <p className="text-sm text-gray-600">
                Due: {row.dueAt ? new Date(row.dueAt).toLocaleDateString() : '—'}
              </p>
              <button
                onClick={() => onRead(row)}
                className="mt-3 px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                title="Read this book"
              >
                Read Now
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
