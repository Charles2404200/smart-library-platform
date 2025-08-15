// src/services/searchService.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export async function searchBooks(filters) {
  const params = {};
  if (filters.title) params.title = filters.title;
  if (filters.author) params.author = filters.author;
  if (filters.genre) params.genre = filters.genre;
  if (filters.publisher) params.publisher = filters.publisher;

  const res = await axios.get(`${API_URL}/search/books`, { params });
  return res.data;
}
