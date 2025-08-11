import React, { useState, useEffect } from 'react';

export default function BookForm({ onSubmit, initialData = null, onCancel }) {
  const [book, setBook] = useState({
    title: '',
    genre: '',
    publisher_id: '',
    copies: 1,
  });

  useEffect(() => {
    if (initialData) {
      setBook(initialData);
    } else {
      setBook({ title: '', genre: '', publisher_id: '', copies: 1 });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBook((prevBook) => ({ ...prevBook, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(book);
  };

  return (
    <div className="mb-8 p-6 border rounded-lg bg-gray-50 shadow-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-2xl font-semibold text-gray-800">{initialData ? 'Edit Book' : 'Add New Book'}</h3>
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
          <input type="text" id="title" name="title" value={book.title} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1"/>
        </div>
        <div>
          <label htmlFor="genre" className="block text-sm font-medium text-gray-700">Genre</label>
          <input type="text" id="genre" name="genre" value={book.genre} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1"/>
        </div>
        <div>
          <label htmlFor="publisher_id" className="block text-sm font-medium text-gray-700">Publisher ID</label>
          <input type="number" id="publisher_id" name="publisher_id" value={book.publisher_id} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1"/>
        </div>
        <div>
          <label htmlFor="copies" className="block text-sm font-medium text-gray-700">Copies</label>
          <input type="number" id="copies" name="copies" value={book.copies} onChange={handleChange} min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1"/>
        </div>
        <div className="flex space-x-4">
           <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg">
            {initialData ? 'Update Book' : 'Add Book'}
          </button>
          <button type="button" onClick={onCancel} className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 rounded-lg">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}