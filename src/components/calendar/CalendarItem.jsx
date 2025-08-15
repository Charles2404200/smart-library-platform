import React from 'react';
import { daysLeft, fmtDateTime, downloadICS, googleCalUrl } from '../../utils/calendar';

export default function CalendarItem({ item }) {
  const overdue = item.overdue || new Date(item.dueAt) < new Date();

  return (
    <div className="border rounded-lg p-3 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="font-medium text-gray-800">{item.title}</div>
        {overdue ? (
          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">Overdue</span>
        ) : (
          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
            Due in {Math.max(0, daysLeft(item.dueAt))}d
          </span>
        )}
      </div>
      <div className="text-sm text-gray-600">Due: {fmtDateTime(item.dueAt)}</div>
      <div className="flex gap-2 mt-2">
        <a
          className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
          href={googleCalUrl(item)}
          target="_blank"
          rel="noreferrer"
        >
          Add to Google Calendar
        </a>
        <button
          onClick={() => downloadICS(item)}
          className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
        >
          Download .ics
        </button>
      </div>
    </div>
  );
}
