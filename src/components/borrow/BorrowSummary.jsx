import React from 'react';

export default function BorrowSummary({ activeCount, returnedCount, overdueCount }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div className="bg-white border rounded-lg p-4 shadow">
        <p className="text-sm text-gray-500">Active borrows</p>
        <p className="text-2xl font-semibold">{activeCount}</p>
      </div>
      <div className="bg-white border rounded-lg p-4 shadow">
        <p className="text-sm text-gray-500">Returned</p>
        <p className="text-2xl font-semibold">{returnedCount}</p>
      </div>
      <div className="bg-white border rounded-lg p-4 shadow">
        <p className="text-sm text-gray-500">Overdue</p>
        <p className="text-2xl font-semibold text-red-600">{overdueCount}</p>
      </div>
    </div>
  );
}
