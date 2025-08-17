import React from 'react';

function parseUtc(d) {
  if (!d) return null;
  // Handle "YYYY-MM-DD HH:MM:SS" (no TZ) as UTC to avoid local-time shifts
  const iso = d.includes('T') ? d : d.replace(' ', 'T');
  return new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
}

function fmt(d) {
  const dt = parseUtc(d);
  return dt ? dt.toLocaleString() : '—';
}

function LateBadge({ late }) {
  if (!late) return <span className="text-green-600 font-semibold">No</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-red-600 font-semibold">Yes</span>
      <span className="text-xs font-semibold text-white bg-red-600 px-2 py-0.5 rounded-full">
        Late
      </span>
    </span>
  );
}

export default function ReturnHistoryTable({ rows }) {
  if (!rows || rows.length === 0) {
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
            const due = parseUtc(row.dueAt);
            const returned = parseUtc(row.returnAt);

            const late =
              row.isLate === true ||
              row.isLate === 1 ||
              row.isLate === '1' ||
              (!!due && !!returned && returned.getTime() > due.getTime());

            return (
              <tr key={row.checkoutId || row.id} className="border-t">
                <td className="px-3 py-2">{row.title || 'Untitled'}</td>
                <td className="px-3 py-2">{fmt(row.checkoutAt)}</td>
                <td className="px-3 py-2">{fmt(row.dueAt)}</td>
                <td className="px-3 py-2">{fmt(row.returnAt)}</td>
                <td className="px-3 py-2">
                  <LateBadge late={late} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
