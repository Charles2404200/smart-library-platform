// src/services/authService.js
import { http } from './http';

export function login({ email, password }) {
  return http('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    token: null,
  });
}

export function register({ name, email, password, role = 'reader' }) {
  return http('/api/auth/register', {
    method: 'POST',
    body: { name, email, password, role },
    token: null,
  });
}
