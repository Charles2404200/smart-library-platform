// src/services/http.js
import { API_URL } from '../config/env';

export async function http(path, { method = 'GET', body, token, headers } = {}) {
  const url = `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
  };
  const jwt = token ?? JSON.parse(localStorage.getItem('token') || 'null');
  if (jwt) opts.headers.Authorization = `Bearer ${jwt}`;
  if (body !== undefined) opts.body = typeof body === 'string' ? body : JSON.stringify(body);

  const res = await fetch(url, opts);
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = typeof data === 'string' ? data : data?.error || 'Request failed';
    throw new Error(msg);
  }
  return data;
}
