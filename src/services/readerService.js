import { API_URL } from '../config/env';

// read token similar to your http() helper
function getJwt() {
  let stored = null;
  try { stored = localStorage.getItem('token'); } catch {}
  if (!stored) return null;
  try { return JSON.parse(stored); } catch { return stored; }
}
function authHeaders() {
  const jwt = getJwt();
  return jwt ? { Authorization: `Bearer ${jwt}` } : {};
}

export async function openEbook(bookId = 0) {
  const res = await fetch(`${API_URL}/api/ebooks/${Number(bookId) || 0}/open`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({}), // body not needed, but keep shape consistent
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Failed to open eBook');
  return data; // { sessionId, fileUrl }
}

export function sendProgress(bookId, sessionId, payload = {}) {
  // keepalive allows it to send during tab close, unlike classic fetch
  return fetch(`${API_URL}/api/ebooks/${Number(bookId) || 0}/progress`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ sessionId, ...payload }),
    keepalive: true,
    credentials: 'include',
  }).catch(() => {});
}

export function sendEnd(bookId, sessionId) {
  return fetch(`${API_URL}/api/ebooks/${Number(bookId) || 0}/end`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ sessionId }),
    keepalive: true,
    credentials: 'include',
  }).catch(() => {});
}
