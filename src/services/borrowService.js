// src/services/borrowService.js
import { http } from './http';

export function getMyBorrows() {
  return http('/api/borrow/my-borrows');
}

export function returnBook(checkoutId) {
  return http('/api/borrow/return', {
    method: 'POST',
    body: { checkoutId },
  });
}

export function borrowBook({ bookId, borrowAt, dueAt }) {
  return http('/api/borrow/borrow', {
    method: 'POST',
    body: { bookId, borrowAt, dueAt },
  });
}
