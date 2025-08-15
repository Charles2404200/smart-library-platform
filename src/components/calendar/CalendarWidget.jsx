import React, { useMemo, useRef, useState, useEffect } from 'react';
import CalendarButton from './CalendarButton';
import CalendarPopover from './CalendarPopover';
import useBorrowsRealtime from '../../hooks/useBorrowsRealtime';
import useDueNotifications from '../../hooks/useDueNotifications';
import { fmtDateTime } from '../../utils/calendar';

export default function CalendarWidget({ isAuthenticated, user }) {
  const { activeBorrows, loading } = useBorrowsRealtime(isAuthenticated, user);
  const { enabled: notifEnabled, setEnabled: setNotifEnabled, request: requestNotif } =
    useDueNotifications(activeBorrows);

  const overdueCount = useMemo(
    () => activeBorrows.filter((b) => b.overdue || new Date(b.dueAt) < new Date()).length,
    [activeBorrows]
  );

  const nextDue = useMemo(() => {
    const list = [...activeBorrows].sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
    return list[0] || null;
  }, [activeBorrows]);

  const nextDueLabel = nextDue ? `Due: ${new Date(nextDue.dueAt).toLocaleDateString()}` : null;

  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // đóng khi click ra ngoài
  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <CalendarButton
        onClick={() => setOpen((v) => !v)}
        activeCount={activeBorrows.length}
        overdueCount={overdueCount}
        nextDueLabel={nextDue ? `Next due: ${fmtDateTime(nextDue.dueAt)}` : undefined}
      />
      {open && (
        <CalendarPopover
          loading={loading}
          activeBorrows={activeBorrows}
          notifEnabled={notifEnabled}
          onToggleNotif={setNotifEnabled}
          requestNotif={requestNotif}
        />
      )}
    </div>
  );
}
