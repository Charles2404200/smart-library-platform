// src/services/borrowService.js
import { http } from './http';

/**
 * Borrow-related service helpers.
 * Accept both camelCase and snake_case keys from callers so older code kept using snake_case still works.
 */

export function getMyBorrows() {
  return http('/api/borrow/my-borrows');
}

export function returnBook(checkoutId) {
  return http('/api/borrow/return', {
    method: 'POST',
    body: { checkoutId },
  });
}

/**
 * borrowBook(payload)
 * Accepts payload with any of:
 *  - { bookId, borrowAt, dueAt }
 *  - { book_id, borrow_at, due_at }
 *  - or mixed
 */
export function borrowBook(payload = {}) {
  const bookId = payload.bookId ?? payload.book_id ?? payload.id ?? payload.bookId;
  const borrowAt = payload.borrowAt ?? payload.borrow_at ?? payload.borrow_at;
  const dueAt = payload.dueAt ?? payload.due_at ?? payload.due_at;

  return http('/api/borrow/borrow', {
    method: 'POST',
    body: { bookId, borrowAt, dueAt },
  });
}
