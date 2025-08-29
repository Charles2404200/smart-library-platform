// src/utils/resolveImageUrl.js
import { API_URL } from '../config/env';

export function resolveImageUrl(u) {
  if (!u) return undefined;
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  // Ensure exactly one slash between API_URL and path
  return `${API_URL}${u.startsWith('/') ? '' : '/'}${u}`;
}
