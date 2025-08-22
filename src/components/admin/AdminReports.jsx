// src/components/admin/AdminReports.jsx
import React, { useState, useEffect } from 'react';
import { getMostBorrowed, getTopReaders, getLowAvailability } from '../../services/adminService';

/**
 * AdminReports
 * Small admin-only UI to generate three reports:
 * - Most borrowed books in a time range
 * - Top active readers in a time range
 * - Books with low availability (threshold)
 */
export default function AdminReports() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [limit, setLimit] = useState(10);
  const [threshold, setThreshold] = useState(5);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [title, setTitle] = useState('');

  useEffect(() => {
    console.log('AdminReports mounted');
  }, []);

  // role guard: only show for real admins (reads localStorage.user set by App on login)
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    user = null;
  }
  if (user && user.role && user.role !== 'admin') {
    return (
      <div className="bg-white border rounded p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-indigo-700 mb-4">📊 Admin Reports</h2>
        <div className="text-sm text-gray-600">Only users with <strong>admin</strong> role can view reports.</div>
      </div>
    );
  }

  const runMostBorrowed = async () => {
    setLoading(true); setTitle('Most borrowed books'); setColumns(['book_id','title','borrow_count']);
    try {
      const data = await getMostBorrowed({ start, end, limit });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      alert(e.message || 'Failed to run report');
    } finally { setLoading(false); }
  };

  const runTopReaders = async () => {
    setLoading(true); setTitle('Top active readers'); setColumns(['id','name','email','checkouts']);
    try {
      const data = await getTopReaders({ start, end, limit });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      alert(e.message || 'Failed to run report');
    } finally { setLoading(false); }
  };

  const runLowAvailability = async () => {
    setLoading(true); setTitle('Books with low availability'); setColumns(['book_id','title','available_copies','copies']);
    try {
      const data = await getLowAvailability({ threshold });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      alert(e.message || 'Failed to run report');
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-white border rounded p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-indigo-700 mb-4">📊 Admin Reports</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
        <div>
          <label className="block text-sm text-gray-600">Start date</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className="w-full px-3 py-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm text-gray-600">End date</label>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="w-full px-3 py-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Limit (top N)</label>
          <input type="number" value={limit} onChange={e => setLimit(Number(e.target.value) || 10)} className="w-full px-3 py-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Low availability ≤</label>
          <input type="number" value={threshold} onChange={e => setThreshold(Number(e.target.value) || 5)} className="w-full px-3 py-2 border rounded" />
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <button onClick={runMostBorrowed} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700" disabled={loading}>
          Most borrowed
        </button>
        <button onClick={runTopReaders} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700" disabled={loading}>
          Top readers
        </button>
        <button onClick={runLowAvailability} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700" disabled={loading}>
          Low availability
        </button>
        <div className="ml-auto text-sm text-gray-500">
          {loading ? 'Generating...' : rows.length ? `${rows.length} rows` : 'No report run yet'}
        </div>
      </div>

      {/* Results table */}
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <h3 className="font-medium mb-2">{title}</h3>
          <table className="min-w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-50">
                {columns.map(col => (
                  <th key={col} className="px-3 py-2 text-left text-sm text-gray-600 border">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className={idx % 2 ? 'bg-white' : 'bg-gray-50'}>
                  {columns.map(col => (
                    <td key={col} className="px-3 py-2 text-sm border">{String(r[col] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
