import React, { useState, useEffect } from 'react';

export default function BooksBorrowedPage({ user }) {
  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBorrowedBooks = async () => {
    if (!user) return;
    setLoading(true);
    // This is a placeholder. You need a backend endpoint to fetch books borrowed by a user.
    // Let's simulate this by fetching all checkouts and filtering by user ID.
    // A dedicated endpoint `GET /api/borrow/user/:userId` would be better.
    try {
      // Assuming you might create this endpoint later
      // const res = await fetch(`http://localhost:4000/api/borrow/user/${user.id}`);
      // For now, let's just show a message.
      
      // A workaround could be fetching all books and checkouts, but that is inefficient.
      // For this example, we will assume an endpoint could exist or show a message.
      setBorrowedBooks([]); // Placeholder
    } catch (err) {
      console.error("Failed to fetch borrowed books:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrowedBooks();
  }, [user]);

  const handleReturn = async (checkoutId) => {
     try {
      const res = await fetch('http://localhost:4000/api/borrow/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Book returned successfully!');
        fetchBorrowedBooks(); // Refresh the list
      } else {
        alert(data.error || 'Failed to return book.');
      }
    } catch (err) {
      alert('An error occurred while returning the book.');
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-indigo-700">My Borrowed Books</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <p className="text-center text-gray-500">
            This feature requires a dedicated backend endpoint to list a user's borrowed books. 
            For now, please manage returns through the database directly or have an admin do it.
            The return functionality is implemented, but there's no data to show.
        </p>
        // Example of how it would be rendered:
        /* borrowedBooks.length === 0 ? (
            <p className="text-center text-gray-500">You have no books currently borrowed.</p>
        ) : (
            <div className="space-y-4">
                {borrowedBooks.map(item => (
                    <div key={item.checkoutId} className="bg-white p-4 border rounded-lg flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-semibold">{item.bookTitle}</h2>
                            <p className="text-sm text-gray-500">Borrowed on: {new Date(item.checkoutAt).toLocaleDateString()}</p>
                        </div>
                        <button 
                            onClick={() => handleReturn(item.checkoutId)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                            Return Book
                        </button>
                    </div>
                ))}
            </div>
        )
        */
      )}
    </div>
  );
}