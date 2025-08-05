import React, { useEffect, useState } from 'react';
import { FaBook, FaPen, FaStar } from 'react-icons/fa';

export default function ViewBooksPage({ user }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState({});
  const [reviewModal, setReviewModal] = useState({ isOpen: false, bookId: null });
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const fetchBooks = () => {
    setLoading(true);
    fetch('http://localhost:4000/api/books')
      .then((res) => res.json())
      .then((data) => {
        setBooks(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('❌ Error fetching books:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleBorrow = async (bookId) => {
    if (!user) {
      alert('Please login to borrow a book.');
      return;
    }
    try {
      const res = await fetch('http://localhost:4000/api/borrow/borrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, bookId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Book borrowed successfully!');
        fetchBooks(); // Refresh book list
      } else {
        alert(data.error || 'Failed to borrow book.');
      }
    } catch (err) {
      alert('An error occurred while borrowing the book.');
    }
  };
  
  const handleOpenReviewModal = (bookId) => {
     if (!user) {
      alert('Please login to review a book.');
      return;
    }
    setReviewModal({ isOpen: true, bookId });
  };
  
  const handleCloseReviewModal = () => {
    setReviewModal({ isOpen: false, bookId: null });
    setRating(0);
    setComment('');
  };

  const handleSubmitReview = async () => {
    const { bookId } = reviewModal;
    try {
      const res = await fetch('http://localhost:4000/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, bookId, rating, comment }),
      });
      const data = await res.json();
       if (res.status === 201) {
        alert('Review submitted successfully!');
        handleCloseReviewModal();
      } else {
        alert(data.error || 'Failed to submit review.');
      }
    } catch (err) {
      alert('An error occurred while submitting the review.');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-indigo-700">📖 All Available Books</h1>

      {loading ? (
        <p className="text-gray-500">Loading books...</p>
      ) : books.length === 0 ? (
        <p className="text-red-500">No books available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <div
              key={book.id}
              className="bg-white p-5 border rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between"
            >
              <div>
                <h2 className="text-xl font-semibold text-indigo-600">{book.title}</h2>
                <p className="text-gray-700 mt-1">by {book.authors}</p>
                <p className="text-gray-600 text-sm mt-2"><strong>Publisher:</strong> {book.publisher}</p>
                <p className="text-gray-600 text-sm"><strong>Genre:</strong> {book.genre}</p>
                <p className={`text-sm font-semibold ${book.available_copies > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {book.available_copies > 0 ? `${book.available_copies} available` : 'Not available'}
                </p>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button 
                  onClick={() => handleBorrow(book.id)}
                  disabled={book.available_copies <= 0}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition"
                >
                  <FaBook className="inline mr-1" /> Borrow
                </button>
                <button 
                  onClick={() => handleOpenReviewModal(book.id)}
                  className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-100 rounded-lg hover:bg-indigo-200 transition"
                >
                  <FaPen className="inline mr-1" /> Review
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Review Modal */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Write a Review</h2>
            <div className="mb-4">
              <label className="block text-gray-700">Rating</label>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <FaStar
                    key={i}
                    className={`cursor-pointer ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
                    onClick={() => setRating(i + 1)}
                  />
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="comment" className="block text-gray-700">Comment</label>
              <textarea
                id="comment"
                rows="4"
                className="w-full border rounded-lg p-2"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              ></textarea>
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={handleCloseReviewModal} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
              <button onClick={handleSubmitReview} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}