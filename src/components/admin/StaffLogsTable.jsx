import React from 'react';

export default function StaffLogsTable({ logs, loading }) {
  return (
    <div className="bg-white border rounded-xl shadow p-5">
      <h2 className="text-xl font-semibold mb-4">🧾 Staff Logs</h2>
      {loading ? (
        <p className="text-gray-500">Loading logs…</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-500">No logs found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border border-gray-300 shadow-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Staff</th>
                <th className="px-3 py-2 text-left">Action</th>
                <th className="px-3 py-2 text-left">Target</th>
                <th className="px-3 py-2 text-left">At</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((lg) => (
                <tr key={lg.id} className="border-t">
                  <td className="px-3 py-2">{lg.id}</td>
                  <td className="px-3 py-2">{lg.staff_name || lg.staffName || lg.staff_id || '-'}</td>
                  <td className="px-3 py-2">{lg.action || '-'}</td>
                  <td className="px-3 py-2">{lg.target || '-'}</td>
                  <td className="px-3 py-2">
                    {lg.createdAt
                      ? new Date(lg.createdAt).toLocaleString()
                      : lg.created_at
                      ? new Date(lg.created_at).toLocaleString()
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
