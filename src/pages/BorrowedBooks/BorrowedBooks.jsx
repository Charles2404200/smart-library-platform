import React, { useEffect, useMemo, useState } from 'react';
import { getMyBorrows, returnBook } from '../../services/borrowService';
import BorrowSummary from '../../components/borrow/BorrowSummary';
import ActiveBorrowsList from '../../components/borrow/ActiveBorrowsList';
import ReturnHistoryTable from '../../components/borrow/ReturnHistoryTable';
import { storage } from '../../utils/storage';
import { io } from 'socket.io-client';

function parseUtc(d) {
  if (!d) return null;
  const iso = d.includes('T') ? d : d.replace(' ', 'T');
  return new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
}

export default function BorrowedBooks() {
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const user = storage.get('user', null);
  const token = JSON.parse(localStorage.getItem('token') || 'null');

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const data = await getMyBorrows();
      const rows = Array.isArray(data) ? data : data.borrows || [];
      setBorrows(rows);
    } catch (e) {
      setErr(e.message || 'Failed to load borrows');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      setErr('Please log in to view your borrowed books.');
      setLoading(false);
      return;
    }
    load();
  }, []); // initial

  // Real-time: join personal room and refresh on server events
  useEffect(() => {
    if (!token || !user?.id) return;

    const socket = io('http://localhost:4000', {
      transports: ['websocket'],
      auth: { token },
    });

    socket.on('connect', () => {
      socket.emit('join-user', user.id);
    });

    socket.on('borrows:changed', (payload) => {
      if (payload?.userId === user.id) {
        load();
      }
    });

    return () => socket.disconnect();
  }, [token, user?.id]);

  const active = useMemo(() => borrows.filter(b => !b.returnAt), [borrows]);
  const returned = useMemo(() => borrows.filter(b => !!b.returnAt), [borrows]);

  function computeOverdue(row) {
    // trust server flag if present
    const serverOverdue =
      row.overdue === true ||
      row.overdue === 1 ||
      row.overdue === '1';

    // fallback: compare dueAt vs now using UTC parsing
    const due = parseUtc(row.dueAt);
    const notReturned = !row.returnAt;
    const clientOverdue = !!due && notReturned && Date.now() > due.getTime();

    return serverOverdue || clientOverdue;
  }

  async function handleReturn(checkoutId) {
    try {
      setActionMsg('');
      await returnBook(checkoutId);

      setActionMsg('✅ Book returned successfully.');
      // Optimistic: only stamp returnAt; let server compute isLate, then reload
      setBorrows(prev =>
        prev.map(b =>
          (b.checkoutId === checkoutId || b.id === checkoutId)
            ? { ...b, returnAt: new Date().toISOString() }
            : b
        )
      );
      load(); // sync flags (isLate) from backend
    } catch (e) {
      setActionMsg(`❌ ${e.message || 'Return failed'}`);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-indigo-700 mb-6">📚 My Borrowed Books</h1>

      {actionMsg && (
        <div className="mb-4 p-3 rounded border text-sm bg-blue-50 border-blue-300 text-blue-800">
          {actionMsg}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading your borrows…</p>
      ) : err ? (
        <p className="text-red-600">{err}</p>
      ) : (
        <>
          <BorrowSummary
            activeCount={active.length}
            returnedCount={returned.length}
            overdueCount={active.filter(computeOverdue).length}
          />

          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-3">Currently Borrowed</h2>
            <ActiveBorrowsList active={active} onReturn={handleReturn} />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Return History</h2>
            <ReturnHistoryTable rows={returned} />
          </section>
        </>
      )}
    </div>
  );
}
