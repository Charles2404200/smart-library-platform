// src/services/readerService.js
import { API_URL } from '../config/env';

/** Safely get JWT from localStorage whether it was saved raw or JSON-stringified */
function getToken() {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!stored) return null;
  try { return JSON.parse(stored); } catch { return stored; }
}

/** Minimal keepalive POST with auth (used by progress/highlight/end) */
async function postKeepalive(url, jsonBody) {
  const token = getToken();
  const init = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(jsonBody || {}),
    keepalive: true,
    credentials: 'include',
  };

  // Fire-and-forget but do a single quick retry for flaky networks
  try {
    const res = await fetch(url, init);
    if (!res.ok && res.status >= 500) {
      // one small backoff retry (non-blocking)
      setTimeout(() => { fetch(url, init).catch(() => {}); }, 200);
    }
  } catch {
    // last resort retry
    setTimeout(() => { fetch(url, init).catch(() => {}); }, 200);
  }
}

/** Open/start a reading session for a given bookId (must be actively borrowed) */
export async function openEbook(bookId) {
  const id = Number(bookId);
  if (!Number.isFinite(id) || id <= 0) throw new Error('Invalid bookId');

  const token = getToken();
  const res = await fetch(`${API_URL}/api/ebooks/${id}/open`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });

  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = (typeof data === 'string' && data) || data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  // BE returns { sessionId, token, fileUrl }
  return data;
}

/** Alias if you prefer this name elsewhere */
export const startSession = openEbook;

/**
 * Send reading progress with optional fields:
 *  - pagePercent: number (0..100)
 *  - cfi: string (epub location)
 *  - page: number (optional discrete page marker)
 */
export function beaconProgress(bookId, sessionId, payload = {}) {
  const id = Number(bookId);
  if (!sessionId || !Number.isFinite(id) || id <= 0) return;

  const body = { sessionId };
  if (typeof payload.pagePercent === 'number') body.pagePercent = payload.pagePercent;
  if (typeof payload.cfi === 'string') body.cfi = payload.cfi;
  if (Number.isFinite(Number(payload.page))) body.page = Number(payload.page);

  postKeepalive(`${API_URL}/api/ebooks/${id}/progress`, body);
}

/** Add a highlight (page, text, color?) */
export function beaconHighlight(bookId, sessionId, { page, text, color } = {}) {
  const id = Number(bookId);
  if (!sessionId || !Number.isFinite(id) || id <= 0) return;
  if (!Number.isFinite(Number(page))) return; // need a page to store highlight

  postKeepalive(`${API_URL}/api/ebooks/${id}/highlight`, {
    sessionId,
    page: Number(page),
    text: String(text || ''),
    color: color ?? null,
  });
}

/** End a reading session (keepalive so it succeeds during navigation/unload) */
export function beaconEnd(bookId, sessionId) {
  const id = Number(bookId);
  if (!sessionId || !Number.isFinite(id) || id <= 0) return;
  postKeepalive(`${API_URL}/api/ebooks/${id}/end`, { sessionId });
}
