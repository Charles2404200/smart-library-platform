// src/components/admin/StaffLogsTable.jsx
import React from 'react';

/**
 * StaffLogsTable
 * Props:
 *  - logs: Array<Log>
 *  - loading: boolean
 */
export default function StaffLogsTable({ logs = [], loading = false }) {
  // --- Pagination
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(30);
  const totalItems = Array.isArray(logs) ? logs.length : 0;
  const pageCount  = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (page - 1) * pageSize;
  const endIndex   = Math.min(totalItems, startIndex + pageSize);
  const paged      = React.useMemo(
    () => (Array.isArray(logs) ? logs.slice(startIndex, startIndex + pageSize) : []),
    [logs, startIndex, pageSize]
  );

  React.useEffect(() => { setPage(1); }, [logs]);

  return (
    <div className="bg-white border rounded-xl shadow p-5">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-xl font-semibold">🧾 Staff Logs</h2>
        <select
          className="border rounded px-2 py-2"
          value={pageSize}
          onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }}
          aria-label="Rows per page"
        >
          {[20, 30, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading logs…</p>
      ) : totalItems === 0 ? (
        <p className="text-gray-500">No logs found.</p>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Page {page} / {pageCount} · Showing {startIndex + 1}–{endIndex} of {totalItems}
            </span>
            <div className="space-x-2">
              <button
                className="px-3 py-1 border rounded disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                className="px-3 py-1 border rounded disabled:opacity-50"
                disabled={page >= pageCount}
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
              >
                Next
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border border-gray-300 shadow-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Actor</th>
                  <th className="px-3 py-2 text-left">Action</th>
                  <th className="px-3 py-2 text-left">Details</th>
                  <th className="px-3 py-2 text-left">When</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((lg) => (
                  <tr key={lg.id ?? `${lg.actor}-${lg.created_at}`} className="border-t align-top">
                    <td className="px-3 py-2">{lg.id ?? '-'}</td>
                    <td className="px-3 py-2">{lg.actor ?? lg.user_id ?? '-'}</td>
                    <td className="px-3 py-2">{lg.action ?? '-'}</td>
                    <td className="px-3 py-2 text-sm whitespace-pre-wrap">{lg.details ?? '-'}</td>
                    <td className="px-3 py-2">
                      {lg.createdAt ? new Date(lg.createdAt).toLocaleString() :
                       lg.created_at ? new Date(lg.created_at).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Page {page} / {pageCount} · Showing {startIndex + 1}–{endIndex} of {totalItems}
            </span>
            <div className="space-x-2">
              <button
                className="px-3 py-1 border rounded disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                className="px-3 py-1 border rounded disabled:opacity-50"
                disabled={page >= pageCount}
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
