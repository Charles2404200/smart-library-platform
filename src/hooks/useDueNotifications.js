import { useEffect, useRef, useState } from 'react';

export default function useDueNotifications(activeBorrows) {
  const [enabled, setEnabled] = useState(false);
  const timersRef = useRef([]);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (!enabled || activeBorrows.length === 0) return;
    if (!('Notification' in window)) return;

    const now = Date.now();
    const ahead = 60 * 60 * 1000; // 1 hour ahead

    activeBorrows.forEach((item) => {
      const due = new Date(item.dueAt).getTime();
      if (isNaN(due) || due <= now) return;
      const fireAt = Math.max(due - ahead, now + 2000);
      const delay = fireAt - now;
      const id = setTimeout(() => {
        if (Notification.permission === 'granted') {
          new Notification('⏰ Return book reminder', {
            body: `"${item.title}" is due ${new Date(item.dueAt).toLocaleString()}.`,
          });
        }
      }, delay);
      timersRef.current.push(id);
    });

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [enabled, activeBorrows]);

  const request = async () => {
    if (!('Notification' in window)) {
      alert('Notifications are not supported in this browser.');
      return;
    }
    if (Notification.permission === 'granted') {
      setEnabled(true);
      return;
    }
    if (Notification.permission === 'denied') {
      alert('Notifications are blocked. Enable them in your browser settings.');
      return;
    }
    const perm = await Notification.requestPermission();
    setEnabled(perm === 'granted');
  };

  return { enabled, setEnabled, request };
}
