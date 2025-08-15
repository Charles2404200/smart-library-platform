import React from 'react';
import { FaBell } from 'react-icons/fa';
import CalendarItem from './CalendarItem';
import { fmtDateTime, daysLeft } from '../../utils/calendar';

export default function CalendarPopover({
  loading,
  activeBorrows,
  notifEnabled,
  onToggleNotif,
  requestNotif,
}) {
  const nextDue = activeBorrows
    .slice()
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))[0];

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white border rounded-xl shadow-lg z-50 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <FaBell /> Return Reminders
        </h3>
        <button
          onClick={async () => (notifEnabled ? onToggleNotif(false) : await requestNotif())}
          className={`px-3 py-1 rounded text-sm border ${
            notifEnabled
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-gray-50 text-gray-700 border-gray-200'
          }`}
        >
          {notifEnabled ? 'Notifications On' : 'Enable Notifications'}
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading due items…</p>
      ) : activeBorrows.length === 0 ? (
        <p className="text-gray-600">No active borrowed books.</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {nextDue && (
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
              <div className="text-xs uppercase text-indigo-700 font-semibold tracking-wide">
                Next due
              </div>
              <div className="mt-1 font-medium text-indigo-900">{nextDue.title}</div>
              <div className="text-sm text-indigo-800">
                {fmtDateTime(nextDue.dueAt)} ({daysLeft(nextDue.dueAt)} day(s) left)
              </div>
            </div>
          )}

          {activeBorrows.map((item) => (
            <CalendarItem key={item.checkoutId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
