// src/services/adminService.js
import { http } from './http';

// -------- Fetchers --------
export const getBooks = () =>
  http('/api/admin/books');

export const getLogs = () =>
  http('/api/admin/logs');

export const getUsers = () =>
  http('/api/admin/users');

// -------- Mutations --------
export const updateCopies = (bookId, copies) =>
  http(`/api/admin/books/${bookId}/copies`, {
    method: 'PATCH',
    body: { copies: Number(copies) },
  });

export const updateAvailable = (bookId, available) =>
  http(`/api/admin/books/${bookId}/available`, {
    method: 'PATCH',
    body: { available: Number(available) },
  });

export const addBook = (payload) =>
  http('/api/admin/books', {
    method: 'POST',
    body: payload,
  });

export const uploadBookImage = async (bookId, file) => {
  const token = JSON.parse(localStorage.getItem('token') || 'null');
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch(`http://localhost:4000/api/admin/books/${bookId}/image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to upload image');
  return data; // { image_url }
};

export const changeUserRole = (userId, role) =>
  http(`/api/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: { role },
  });
