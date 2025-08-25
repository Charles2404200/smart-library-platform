// src/services/readerService.js
import { API_URL } from '../config/env';

/** Safely get JWT from localStorage whether it was saved raw or JSON-stringified */
function getToken() {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!stored) return null;
  try {
    return JSON.parse(stored); // if it was saved like '"eyJ..."'
  } catch {
    return stored; // normal raw token 'eyJ...'
  }
}

/** Open/start a reading session for a given bookId (must be actively borrowed) */
export async function openEbook(bookId) {
  if (!Number.isFinite(Number(bookId)) || Number(bookId) <= 0) {
    throw new Error('Invalid bookId');
  }

  const token = getToken();
  const res = await fetch(`${API_URL}/api/ebooks/${bookId}/open`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include', // safe with your CORS config
  });

  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = (typeof data === 'string' && data) || data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  // { sessionId, fileUrl }
  return data;
}

/** Alias if you prefer this name elsewhere */
export const startSession = openEbook;

/**
 * Send reading progress. Uses fetch keepalive so it can fire during unload
 * and still include the Authorization header (sendBeacon cannot set headers).
 *
 * @param {number} bookId
 * @param {string} sessionId
 * @param {{ pagePercent?: number, cfi?: string, page?: number }} payload
 */
export function beaconProgress(bookId, sessionId, payload = {}) {
  try {
    const token = getToken();
    const body = JSON.stringify({ sessionId, ...payload });

    // Fire-and-forget; don't await.
    fetch(`${API_URL}/api/ebooks/${bookId}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
      keepalive: true,
      credentials: 'include',
    }).catch(() => {});
  } catch (e) {
    // non-fatal
    console.error('Progress send failed:', e);
  }
}

/**
 * End a reading session (also keepalive so it succeeds during navigation/unload).
 *
 * @param {number} bookId
 * @param {string} sessionId
 */
export function beaconEnd(bookId, sessionId) {
  try {
    const token = getToken();
    const body = JSON.stringify({ sessionId });

    fetch(`${API_URL}/api/ebooks/${bookId}/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
      keepalive: true,
      credentials: 'include',
    }).catch(() => {});
  } catch (e) {
    // non-fatal
    console.error('End send failed:', e);
  }
}
