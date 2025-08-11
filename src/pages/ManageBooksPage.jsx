import React, { useState, useEffect } from 'react';
import BookForm from '../components/BookForm';

export default function ManageBooksPage() {
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
      console.error('Error fetching books:', err);
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bookData),
      });

      if (res.ok) {
        alert(`Book ${isEditing ? 'updated' : 'added'} successfully!`);
        setShowForm(false);
        setEditingBook(null);
        fetchBooks(); // Refresh the list
      } else {
        const result = await res.json();
        alert(`Error: ${result.error}`);
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

  const handleEdit = (book) => {
    setEditingBook(book);
    setShowForm(true);
  };
  
  const handleAddNew = () => {
    setEditingBook(null);
    setShowForm(true);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-indigo-700">📚 Manage Books</h1>
      
      {!showForm ? (
         <button onClick={handleAddNew} className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
           + Add New Book
         </button>
      ) : (
        <div className="mb-6">
          <BookForm onSubmit={handleFormSubmit} initialData={editingBook} />
          <button onClick={() => setShowForm(false)} className="mt-2 text-sm text-red-600">Cancel</button>
        </div>
      )}

      <table className="w-full table-auto border border-gray-300 shadow-md">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 text-left">ID</th>
            <th className="px-4 py-2 text-left">Title</th>
            <th className="px-4 py-2 text-left">Genre</th>
            <th className="px-4 py-2 text-left">Copies</th>
            <th className="px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {books.map((book) => (
            <tr key={book.book_id} className="border-t">
              <td className="px-4 py-2">{book.book_id}</td>
              <td className="px-4 py-2">{book.title}</td>
              <td className="px-4 py-2">{book.genre}</td>
              <td className="px-4 py-2">{book.copies}</td>
              <td className="px-4 py-2">
                <button onClick={() => handleEdit(book)} className="text-blue-500 hover:underline mr-4">Edit</button>
                <button onClick={() => handleDelete(book.book_id)} className="text-red-500 hover:underline">Retire</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}