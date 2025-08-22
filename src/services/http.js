// src/services/http.js
import { API_URL } from '../config/env';

/**
 * Lightweight fetch wrapper used across the app.
 * - Safely reads token from localStorage (handles raw string or JSON string).
 * - Throws on non-OK responses with readable message.
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
    const stored = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (stored) {
      try {
        // If token was JSON-stringified (e.g. '"abc"'), this returns 'abc'
        jwt = JSON.parse(stored);
      } catch (_err) {
        // If parse fails (normal raw token like 'eyJ...'), fall back to raw value
        jwt = stored;
      }
    } else {
      jwt = null;
    }
  }

  if (jwt) {
    opts.headers.Authorization = `Bearer ${jwt}`;
  }

  // Only attach a body for non-GET methods or when explicitly provided and allowed.
  if (body !== undefined && method.toUpperCase() !== 'GET') {
    opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  // Debug: network-level info in dev
  if (typeof window !== 'undefined' && window && window.console) {
    console.debug('[http] request', { url, method, headers: opts.headers, hasBody: !!opts.body });
  }

  const res = await fetch(url, opts);

  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    // Build a helpful message
    const msg = (typeof data === 'string' && data) || data?.error || data?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.response = data;
    throw err;
  }

  return data;
}
