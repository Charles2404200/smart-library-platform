// src/services/http.js
import { API_URL } from '../config/env';
import { storage } from '../utils/storage';

function normalizeStoredToken(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed;
    if (parsed && typeof parsed.token === 'string') return parsed.token;
    return typeof raw === 'string' ? raw : null;
  } catch (e) {
    return typeof raw === 'string' ? raw : null;
  }
}

export async function http(path, { method = 'GET', body, token, headers } = {}) {
  const url = `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
  };

  let jwt = token;
  if (!jwt) {
    const stored = typeof window !== 'undefined' ? storage.get('token', null) : null;
    jwt = normalizeStoredToken(stored);
  }

  if (jwt) {
    opts.headers.Authorization = `Bearer ${jwt}`;
  }

  if (body !== undefined && method.toUpperCase() !== 'GET') {
    opts.body = JSON.stringify(body);
  }

  console.log('[http] Request', opts.method, url, 'hasToken?', !!jwt);

  const res = await fetch(url, opts);
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    if (res.status === 401) {
      console.warn('[http] 401 Unauthorized detected for', url);
      try {
        storage.remove('token');
        storage.remove('user');
        console.log('[http] Cleared token and user from storage due to 401');
        try { localStorage.setItem('logout', Date.now().toString()); console.log('[http] Broadcast logout via localStorage'); } catch (e) {}
        try {
          if (typeof window !== 'undefined' && typeof window.__appLogout === 'function') {
            console.log('[http] calling window.__appLogout() to ensure same-tab React state updates');
            window.__appLogout();
          }
        } catch (e) {
          console.error('[http] error calling window.__appLogout', e);
        }
      } catch (e) {
        console.error('[http] error handling 401', e);
      }
    }

    const msg = (typeof data === 'string' && data) || data?.error || data?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.response = data;
    throw err;
  }

  return data;
}

/**
 * silentRefresh - call /api/auth/refresh with credentials: 'include' so httpOnly refresh cookie is sent.
 * Returns accessToken string on success, or null on failure.
 */
export async function silentRefresh() {
  const refreshUrl = `${API_URL}/api/auth/refresh`;
  try {
    const res = await fetch(refreshUrl, {
      method: 'POST',
      credentials: 'include', // important for httpOnly cookie refresh tokens
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      console.warn('[http] silentRefresh failed', res.status);
      return null;
    }
    const data = await res.json();
    const token = data?.accessToken || data?.token || null;
    return token;
  } catch (e) {
    console.error('[http] silentRefresh error', e);
    return null;
  }
}

export default http;
