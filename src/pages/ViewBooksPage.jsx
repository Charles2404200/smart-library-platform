import React, { useEffect, useState } from 'react';

export default function ViewBooksPage() {
  const [books, setBooks] = useState([]);

 useEffect(() => {
  fetch('http://localhost:4000/api/books')
    .then((res) => res.json())
    .then((data) => {
      console.log('Fetched books:', data); // ✅ Thêm dòng này
      setBooks(data);
    })
    .catch((err) => console.error('Error fetching books:', err));
}, []);


  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-indigo-700">📖 All Available Books</h1>
      {books.length === 0 ? (
        <p>No books available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {books.map((book) => (
  <div key={book.id} className="bg-white p-4 border rounded shadow">
    <h2 className="text-xl font-semibold text-indigo-600">{book.title}</h2>
    <p className="text-gray-600">Author(s): {book.authors}</p> {/* ✅ fix field name */}
    <p className="text-gray-500 text-sm">Publisher: {book.publisher}</p>
    <p className="text-gray-500 text-sm">Genre: {book.genre}</p>
    <p className="text-gray-500 text-sm">Copies: {book.copies}</p>
  </div>
))}
        </div>
      )}
    </div>
  );
}
