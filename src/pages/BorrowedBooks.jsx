// src/pages/BorrowedBooks.jsx
import React, { useEffect, useMemo, useState } from 'react';

export default function MyBorrowsPage() {
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const token = localStorage.getItem('token');

  async function fetchBorrows() {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch('http://localhost:4000/api/borrow/my-borrows', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load borrows');
      // data can be { borrows: [...] } or direct array depending on your route
      const rows = Array.isArray(data) ? data : data.borrows || [];
      setBorrows(rows);
    } catch (e) {
      console.error('❌ Load borrows error:', e);
      setErr(e.message || 'Failed to load borrows');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      setErr('Please log in to view your borrowed books.');
      setLoading(false);
      return;
    }
    fetchBorrows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = useMemo(() => borrows.filter(b => !b.returnAt), [borrows]);
  const returned = useMemo(() => borrows.filter(b => !!b.returnAt), [borrows]);

  // Helpers
  const fmt = (d) => (d ? new Date(d).toLocaleString() : '—');
  const computeOverdue = (row) => {
    // Prefer backend field; otherwise compute: not returned, has dueAt, now > dueAt
    if (row.overdue !== undefined && row.overdue !== null) return !!Number(row.overdue);
    if (!row.dueAt || row.returnAt) return false;
    return Date.now() > new Date(row.dueAt).getTime();
  };
  const dueBadge = (row) => {
    const overdue = computeOverdue(row);
    if (overdue) return <span className="ml-2 inline-block text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded">Overdue</span>;
    if (!row.dueAt || row.returnAt) return null;

    const msLeft = new Date(row.dueAt).getTime() - Date.now();
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    const label = daysLeft > 1 ? `${daysLeft} days left` : daysLeft === 1 ? '1 day left' : 'Due today';
    return <span className="ml-2 inline-block text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">{label}</span>;
  };

  async function handleReturn(checkoutId) {
    try {
      setActionMsg('');
      const res = await fetch('http://localhost:4000/api/borrow/return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ checkoutId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to return');
      setActionMsg('✅ Book returned successfully.');
      // Optimistic update: mark returned item without refetch
      setBorrows(prev =>
        prev.map(b =>
          b.checkoutId === checkoutId || b.id === checkoutId
            ? { ...b, returnAt: new Date().toISOString() }
            : b
        )
      );
      // Optional: refresh from server to sync late flags, etc.
      fetchBorrows();
    } catch (e) {
      console.error('❌ Return error:', e);
      setActionMsg(`❌ ${e.message || 'Return failed'}`);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-indigo-700 mb-6">📚 My Borrowed Books</h1>

      {actionMsg && (
        <div className="mb-4 p-3 rounded border text-sm
                        bg-blue-50 border-blue-300 text-blue-800">
          {actionMsg}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading your borrows…</p>
      ) : err ? (
        <p className="text-red-600">{err}</p>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border rounded-lg p-4 shadow">
              <p className="text-sm text-gray-500">Active borrows</p>
              <p className="text-2xl font-semibold">{active.length}</p>
            </div>
            <div className="bg-white border rounded-lg p-4 shadow">
              <p className="text-sm text-gray-500">Returned</p>
              <p className="text-2xl font-semibold">{returned.length}</p>
            </div>
            <div className="bg-white border rounded-lg p-4 shadow">
              <p className="text-sm text-gray-500">Overdue</p>
              <p className="text-2xl font-semibold text-red-600">
                {active.filter(computeOverdue).length}
              </p>
            </div>
          </div>

          {/* Active */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-3">Currently Borrowed</h2>
            {active.length === 0 ? (
              <p className="text-gray-500">You have no active borrows.</p>
            ) : (
              <div className="space-y-3">
                {active.map((row) => {
                  const id = row.checkoutId || row.id;
                  const overdue = computeOverdue(row);
                  return (
                    <div
                      key={id}
                      className={`border rounded-lg bg-white shadow p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                        overdue ? 'border-red-300' : 'border-gray-200'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-indigo-700">
                          {row.title || 'Untitled'} {dueBadge(row)}
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
                          onClick={() => handleReturn(id)}
                          className="px-4 py-2 rounded text-white bg-emerald-600 hover:bg-emerald-700"
                          title="Mark as returned"
                        >
                          Return now
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* History */}
          <section>
            <h2 className="text-xl font-semibold mb-3">Return History</h2>
            {returned.length === 0 ? (
              <p className="text-gray-500">No returned items yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto border border-gray-300 bg-white shadow-sm rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-100 text-left">
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Borrowed</th>
                      <th className="px-3 py-2">Due</th>
                      <th className="px-3 py-2">Returned</th>
                      <th className="px-3 py-2">Late?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returned.map((row) => {
                      const late =
                        (row.isLate === true) ||
                        (row.isLate === 1) ||
                        (!!row.dueAt && !!row.returnAt && new Date(row.returnAt) > new Date(row.dueAt));
                      return (
                        <tr key={row.checkoutId || row.id} className="border-t">
                          <td className="px-3 py-2">{row.title || 'Untitled'}</td>
                          <td className="px-3 py-2">{fmt(row.checkoutAt)}</td>
                          <td className="px-3 py-2">{fmt(row.dueAt)}</td>
                          <td className="px-3 py-2">{fmt(row.returnAt)}</td>
                          <td className={`px-3 py-2 font-medium ${late ? 'text-red-600' : 'text-gray-600'}`}>
                            {late ? 'Yes' : 'No'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
