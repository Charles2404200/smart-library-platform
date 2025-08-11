import React, { useState, useEffect } from 'react';
import BookForm from './BookForm'; // Bây giờ tệp này đã tồn tại!

export default function BookManager() {
  const [books, setBooks] = useState([]);
  const [editingBook, setEditingBook] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const fetchBooks = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:4000/api/admin/books', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBooks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('❌ Error fetching books:', err);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleFormSubmit = async (bookData) => {
    const token = localStorage.getItem('token');
    const isEditing = !!editingBook;
    const url = isEditing
      ? `http://localhost:4000/api/admin/update/${editingBook.book_id}`
      : 'http://localhost:4000/api/admin/add';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(bookData),
      });

      if (res.ok) {
        alert(`Book ${isEditing ? 'updated' : 'added'} successfully!`);
        setShowForm(false);
        setEditingBook(null);
        fetchBooks();
      } else {
        const result = await res.json();
        alert(`Error: ${result.error || 'Operation failed'}`);
      }
    } catch (err) {
      console.error('Submit error:', err);
    }
  };

  const handleDelete = async (bookId) => {
    if (!window.confirm('Are you sure you want to retire this book?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:4000/api/admin/retire/${bookId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        alert('Book retired successfully');
        fetchBooks();
      } else {
        alert('Failed to retire book');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <section className="mb-12">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-800">📚 Manage Books</h2>
        {!showForm && (
          <button onClick={() => { setEditingBook(null); setShowForm(true); }} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            + Add New Book
          </button>
        )}
      </div>
      
      {showForm && <BookForm onSubmit={handleFormSubmit} initialData={editingBook} onCancel={() => setShowForm(false)} />}

      <table className="w-full table-auto border border-gray-300 shadow-md">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 text-left">Title</th>
            <th className="px-4 py-2 text-left">Genre</th>
            <th className="px-4 py-2 text-left">Copies</th>
            <th className="px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {books.map((book) => (
            <tr key={book.book_id} className="border-t">
              <td className="px-4 py-2">{book.title}</td>
              <td className="px-4 py-2">{book.genre}</td>
              <td className="px-4 py-2">{book.copies}</td>
              <td className="px-4 py-2">
                <button onClick={() => { setEditingBook(book); setShowForm(true); }} className="text-blue-500 hover:underline mr-4">Edit</button>
                <button onClick={() => handleDelete(book.book_id)} className="text-red-500 hover:underline">Retire</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}