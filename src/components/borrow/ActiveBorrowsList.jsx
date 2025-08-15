import React from 'react';
import ActiveBorrowCard from './ActiveBorrowCard';

export default function ActiveBorrowsList({ active, onReturn }) {
  if (active.length === 0) {
    return <p className="text-gray-500">You have no active borrows.</p>;
  }
  return (
    <div className="space-y-3">
      {active.map((row) => (
        <ActiveBorrowCard key={row.checkoutId || row.id} row={row} onReturn={onReturn} />
      ))}
    </div>
  );
}
