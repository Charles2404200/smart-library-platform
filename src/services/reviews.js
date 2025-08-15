// src/services/reviews.js
import { http } from './http'; // <- named import; our http util exports "http"

export const ReviewsAPI = {
  /**
   * Get reviews + summary for a book
   * GET /api/reviews/book/:bookId
   */
  async list(bookId) {
    if (!bookId) throw new Error('bookId is required');
    return http(`/api/reviews/book/${bookId}`);
  },

  /**
   * Create a review
   * POST /api/reviews  { bookId, rating, comment }
   */
  async create({ bookId, rating, comment }, opts = {}) {
    if (!bookId) throw new Error('bookId is required');
    if (!rating) throw new Error('rating is required');
    return http('/api/reviews', {
      method: 'POST',
      body: { bookId, rating, comment },
      token: opts.token ?? localStorage.getItem('token'),
    });
  },

  /**
   * Delete a review
   * DELETE /api/reviews/:id
   */
  async delete(id, opts = {}) {
    if (!id) throw new Error('id is required');
    return http(`/api/reviews/${id}`, {
      method: 'DELETE',
      token: opts.token ?? localStorage.getItem('token'),
    });
  },

  /**
   * Optional: list my reviews
   * GET /api/reviews/my
   */
  async mine(opts = {}) {
    return http('/api/reviews/my', {
      token: opts.token ?? localStorage.getItem('token'),
    });
  },
};
