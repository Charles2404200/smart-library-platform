import React from 'react';

function fmt(d) {
  return d ? new Date(d).toLocaleString() : '—';
}

export default function ReturnHistoryTable({ rows }) {
  if (rows.length === 0) {
    return <p className="text-gray-500">No returned items yet.</p>;
  }

  return (
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
          {rows.map((row) => {
            const late =
              row.isLate === true ||
              row.isLate === 1 ||
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
  );
}
