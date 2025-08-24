// src/services/http.js
import { API_URL } from '../config/env';
import { storage } from '../utils/storage';

/**
 * Lightweight fetch wrapper used across the app.
 * - Safely reads token from localStorage (handles raw string or JSON string).
 * - If server responds with 401, perform client-side logout (clear token + user)
 *   and broadcast logout to other tabs by updating localStorage key 'logout'.
 */
export async function http(path, { method = 'GET', body, token, headers } = {}) {
  const url = `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
  };

  // Safely obtain JWT: handle raw string or JSON-encoded token
  let jwt = token;
  if (!jwt) {
    const stored = typeof window !== 'undefined' ? storage.get('token', null) : null;
    if (stored) {
      jwt = stored;
    } else {
      jwt = null;
    }
  }

  if (jwt) {
    opts.headers.Authorization = `Bearer ${jwt}`;
  }

  // Only attach a body for non-GET methods or when explicitly provided and allowed.
  if (body !== undefined && method.toUpperCase() !== 'GET') {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    // If 401 Unauthorized, force client-side logout to ensure expired tokens don't keep user logged in.
    if (res.status === 401) {
      try {
        // Clear token & user from storage
        storage.remove('token');
        storage.remove('user');
        // Broadcast logout to other tabs/windows
        try { localStorage.setItem('logout', Date.now().toString()); } catch (e) { /* ignore */ }
      } catch (e) { /* ignore */ }
    }

    // Build a helpful message
    const msg = (typeof data === 'string' && data) || data?.error || data?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.response = data;
    throw err;
  }

  return data;
}
