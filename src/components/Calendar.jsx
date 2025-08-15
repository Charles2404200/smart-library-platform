// src/components/Calendar.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaRegCalendarAlt, FaBell } from 'react-icons/fa';
import { io as ioClient } from 'socket.io-client';

export default function Calendar({ isAuthenticated, user }) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [borrows, setBorrows] = useState([]);
  const [loadingBorrows, setLoadingBorrows] = useState(false);

  // notifications
  const [notifEnabled, setNotifEnabled] = useState(false);
  const notifTimersRef = useRef([]);
  const calRef = useRef(null);
  const [socket, setSocket] = useState(null);

  const toggleCalendar = () => setCalendarOpen((v) => !v);

  const fmt = (d) =>
    new Date(d).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  const daysLeft = (d) => {
    const now = new Date();
    const due = new Date(d);
    return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  };

  // ICS helpers
  const toICSDate = (iso) => {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return (
      d.getUTCFullYear().toString() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) +
      'T' +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      pad(d.getUTCSeconds()) +
      'Z'
    );
  };

  const downloadICS = (item) => {
    const end = new Date(item.dueAt);
    const start = new Date(end.getTime() - 30 * 60 * 1000);
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SmartLibrary//Due Reminder//EN',
      'BEGIN:VEVENT',
      `UID:sl-${item.checkoutId}@smartlibrary`,
      `DTSTAMP:${toICSDate(new Date().toISOString())}`,
      `DTSTART:${toICSDate(start.toISOString())}`,
      `DTEND:${toICSDate(end.toISOString())}`,
      `SUMMARY:Return book: ${item.title}`.replace(/\n/g, ' '),
      `DESCRIPTION:Please return "${item.title}" to SmartLibrary.`.replace(/\n/g, ' '),
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `return-${item.checkoutId}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const googleCalUrl = (item) => {
    const end = new Date(item.dueAt);
    const start = new Date(end.getTime() - 30 * 60 * 1000);
    const dates = `${toICSDate(start.toISOString())}/${toICSDate(end.toISOString())}`;
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `Return book: ${item.title}`,
      dates,
      details: `Please return "${item.title}" to SmartLibrary.`,
      sf: 'true',
      output: 'xml',
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  // fetch borrows
  const loadBorrows = async () => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoadingBorrows(true);
    try {
      const res = await fetch('http://localhost:4000/api/borrow/my-borrows', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBorrows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('❌ Error loading borrows:', e);
      setBorrows([]);
    } finally {
      setLoadingBorrows(false);
    }
  };

  useEffect(() => {
    loadBorrows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // realtime: socket subscribe
  useEffect(() => {
    if (!isAuthenticated) {
      if (socket) { socket.disconnect(); setSocket(null); }
      return;
    }
    const s = ioClient('http://localhost:4000', { transports: ['websocket'] });
    setSocket(s);
    if (user?.id) s.emit('join-user', user.id);
    const refresh = () => loadBorrows();
    s.on('borrows:changed', refresh);
    return () => {
      s.off('borrows:changed', refresh);
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  // computed
  const activeBorrows = useMemo(
    () => borrows.filter((b) => !b.returnAt && b.dueAt),
    [borrows]
  );
  const overdueCount = useMemo(
    () => activeBorrows.filter((b) => b.overdue || new Date(b.dueAt) < new Date()).length,
    [activeBorrows]
  );
  const nextDue = useMemo(() => {
    const list = [...activeBorrows].sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
    return list[0] || null;
  }, [activeBorrows]);

  // notifications schedule (1h before)
  useEffect(() => {
    notifTimersRef.current.forEach((t) => clearTimeout(t));
    notifTimersRef.current = [];
    if (!notifEnabled || activeBorrows.length === 0) return;
    if (!('Notification' in window)) return;

    const now = Date.now();
    const ahead = 60 * 60 * 1000;
    const schedule = (item) => {
      const due = new Date(item.dueAt).getTime();
      if (isNaN(due) || due <= now) return;
      const fireAt = Math.max(due - ahead, now + 2000);
      const delay = fireAt - now;
      const id = setTimeout(() => {
        if (Notification.permission === 'granted') {
          new Notification('⏰ Return book reminder', {
            body: `"${item.title}" is due ${fmt(item.dueAt)}.`,
          });
        }
      }, delay);
      notifTimersRef.current.push(id);
    };
    activeBorrows.forEach(schedule);
    return () => {
      notifTimersRef.current.forEach((t) => clearTimeout(t));
      notifTimersRef.current = [];
    };
  }, [notifEnabled, activeBorrows]);

  const requestNotifications = async () => {
    if (!('Notification' in window)) {
      alert('Notifications are not supported in this browser.');
      return;
    }
    if (Notification.permission === 'granted') {
      setNotifEnabled(true);
      return;
    }
    if (Notification.permission === 'denied') {
      alert('Notifications are blocked. Enable them in your browser settings.');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifEnabled(perm === 'granted');
  };

  // close popover when clicking outside
  useEffect(() => {
    const onDocClick = (e) => {
      if (calRef.current && !calRef.current.contains(e.target)) {
        setCalendarOpen(false);
      }
    };
    if (calendarOpen) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [calendarOpen]);

  // UI
  return (
    <div className="relative" ref={calRef}>
      <button
        onClick={() => setCalendarOpen((v) => !v)}
        className="relative flex items-center gap-2 text-gray-700 hover:text-indigo-700 transition"
        title={nextDue ? `Next due: ${fmt(nextDue.dueAt)}` : 'No active borrows'}
      >
        <FaRegCalendarAlt className="text-xl" />
        {activeBorrows.length > 0 && (
          <span className="text-sm">
            {nextDue ? `Due: ${new Date(nextDue.dueAt).toLocaleDateString()}` : ''}
          </span>
        )}
        {(activeBorrows.length > 0 || overdueCount > 0) && (
          <span
            className={`absolute -top-2 -right-2 text-xs px-1.5 py-0.5 rounded-full text-white ${
              overdueCount > 0 ? 'bg-red-600' : 'bg-indigo-600'
            }`}
          >
            {overdueCount > 0 ? `${overdueCount}!` : activeBorrows.length}
          </span>
        )}
      </button>

      {calendarOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white border rounded-xl shadow-lg z-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <FaBell /> Return Reminders
            </h3>
            <button
              onClick={async () => {
                if (!notifEnabled) await requestNotifications();
                else setNotifEnabled(false);
              }}
              className={`px-3 py-1 rounded text-sm border ${
                notifEnabled
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-gray-50 text-gray-700 border-gray-200'
              }`}
            >
              {notifEnabled ? 'Notifications On' : 'Enable Notifications'}
            </button>
          </div>

          {loadingBorrows ? (
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
                    {fmt(nextDue.dueAt)} ({daysLeft(nextDue.dueAt)} day(s) left)
                  </div>
                </div>
              )}

              {activeBorrows.map((item) => {
                const overdue = item.overdue || new Date(item.dueAt) < new Date();
                return (
                  <div key={item.checkoutId} className="border rounded-lg p-3 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-800">{item.title}</div>
                      {overdue ? (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                          Overdue
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                          Due in {Math.max(0, daysLeft(item.dueAt))}d
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">Due: {fmt(item.dueAt)}</div>
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
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
