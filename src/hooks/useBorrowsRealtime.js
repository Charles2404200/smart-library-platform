import { useCallback, useEffect, useMemo, useState } from 'react';
import { io as ioClient } from 'socket.io-client';
import { cleanToken } from '../utils/token';

const API_BASE = 'http://localhost:4000';

export default function useBorrowsRealtime(isAuthenticated, user) {
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadBorrows = useCallback(async () => {
    if (!isAuthenticated) return;
    const token = cleanToken(localStorage.getItem('token'));
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/borrow/my-borrows`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setBorrows([]);
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }
      const data = await res.json();
      setBorrows(Array.isArray(data) ? data : data?.borrows || []);
    } catch (e) {
      console.error('❌ loadBorrows error:', e);
      setBorrows([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { loadBorrows(); }, [loadBorrows]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = cleanToken(localStorage.getItem('token'));
    const socket = ioClient(API_BASE, {
      transports: ['websocket'],
      auth: { token },
    });
    if (user?.id) socket.emit('join-user', user.id);

    const refresh = () => loadBorrows();
    socket.on('borrows:changed', refresh);

    return () => {
      socket.off('borrows:changed', refresh);
      socket.disconnect();
    };
  }, [isAuthenticated, user?.id, loadBorrows]);

  const activeBorrows = useMemo(
    () => borrows.filter((b) => !b.returnAt && b.dueAt),
    [borrows]
  );

  return { borrows, activeBorrows, loading, reload: loadBorrows };
}
