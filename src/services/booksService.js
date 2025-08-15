// src/services/booksService.js
import { http } from './http';

export function getBooks() {
  return http('/api/books'); // returns array
}
