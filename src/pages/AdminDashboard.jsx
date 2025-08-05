import React, { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaChartBar, FaUsers, FaBook } from 'react-icons/fa';

export default function AdminDashboard({ user }) {
  const [view, setView] = useState('books'); // books, reports, logs
  const [books, setBooks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [reports, setReports] = useState({ topBorrowed: [], topReaders: [], lowStock: [] });
  const [loading, setLoading] = useState(true);
  
  // States for modal
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBook, setCurrentBook] = useState({ id: null, title: '', genre: '', publisher_id: '', copies: 1 });

  const getToken = () => localStorage.getItem('token');
  
  const fetchBooks = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/admin/books', {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setBooks(Array.isArray(data) ? data : []);
    } catch (err) { console.error('Error fetching books:', err); }
  };
  
  const fetchLogs = async () => {
    try {
        const res = await fetch('http://localhost:4000/api/admin/logs', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
    } catch (err) { console.error('Error fetching logs', err); }
  };

  const fetchReports = async () => {
    try {
        const [topBorrowedRes, topReadersRes, lowStockRes] = await Promise.all([
            fetch('http://localhost:4000/api/admin/top-borrowed', { headers: { 'Authorization': `Bearer ${getToken()}` } }),
            fetch('http://localhost:4000/api/report/top-readers', { headers: { 'Authorization': `Bearer ${getToken()}` } }),
            fetch('http://localhost:4000/api/report/low-stock', { headers: { 'Authorization': `Bearer ${getToken()}` } })
        ]);
        const topBorrowed = await topBorrowedRes.json();
        const topReaders = await topReadersRes.json();
        const lowStock = await lowStockRes.json();
        setReports({ topBorrowed, topReaders, lowStock });
    } catch (err) { console.error('Error fetching reports', err); }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchBooks(), fetchLogs(), fetchReports()]).finally(() => setLoading(false));
  }, []);

  const handleOpenModal = (book = null) => {
    if (book) {
      setIsEditing(true);
      setCurrentBook({id: book.book_id, title: book.title, genre: book.genre, publisher_id: book.publisher_id || 1, copies: book.copies});
    } else {
      setIsEditing(false);
      setCurrentBook({ id: null, title: '', genre: '', publisher_id: 1, copies: 1 });
    }
    setModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setModalOpen(false);
  };
  
  const handleSaveBook = async () => {
    const url = isEditing ? `http://localhost:4000/api/admin/update/${currentBook.id}` : 'http://localhost:4000/api/admin/add';
    const method = isEditing ? 'PUT' : 'POST';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}` 
        },
        body: JSON.stringify({ ...currentBook, publisher: currentBook.publisher_id }), // Match backend expectation
      });
      if (res.ok) {
        alert(`Book ${isEditing ? 'updated' : 'added'} successfully!`);
        fetchBooks();
        handleCloseModal();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save book.');
      }
    } catch (err) {
      alert('An error occurred.');
    }
  };
  
  const handleDeleteBook = async (bookId) => {
    if (window.confirm('Are you sure you want to retire this book?')) {
      try {
        const res = await fetch(`http://localhost:4000/api/admin/retire/${bookId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${getToken()}` },
        });
        if (res.ok) {
          alert('Book retired successfully!');
          fetchBooks();
        } else {
          const data = await res.json();
          alert(data.error || 'Failed to retire book.');
        }
      } catch (err) {
        alert('An error occurred.');
      }
    }
  };


  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-indigo-700">🛠 Admin Dashboard</h1>
      
      <div className="flex space-x-4 mb-6 border-b">
        <button onClick={() => setView('books')} className={`py-2 px-4 ${view === 'books' ? 'border-b-2 border-indigo-600 text-indigo-600' : ''}`}>Manage Books</button>
        <button onClick={() => setView('reports')} className={`py-2 px-4 ${view === 'reports' ? 'border-b-2 border-indigo-600 text-indigo-600' : ''}`}>Reports</button>
        <button onClick={() => setView('logs')} className={`py-2 px-4 ${view === 'logs' ? 'border-b-2 border-indigo-600 text-indigo-600' : ''}`}>Staff Logs</button>
      </div>

      {loading ? <p>Loading...</p> : (
        <>
          {view === 'books' && (
            <div>
              <button onClick={() => handleOpenModal()} className="mb-4 px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700">
                <FaPlus /> Add New Book
              </button>
              <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                <table className="w-full table-auto">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Title</th>
                      <th className="px-4 py-2 text-left">Genre</th>
                      <th className="px-4 py-2 text-left">Publisher</th>
                      <th className="px-4 py-2 text-center">Copies</th>
                      <th className="px-4 py-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {books.map(book => (
                      <tr key={book.book_id} className="border-t">
                        <td className="px-4 py-2">{book.title}</td>
                        <td className="px-4 py-2">{book.genre}</td>
                        <td className="px-4 py-2">{book.publisher}</td>
                        <td className="px-4 py-2 text-center">{book.copies}</td>
                        <td className="px-4 py-2 text-center">
                          <button onClick={() => handleOpenModal(book)} className="text-blue-500 hover:text-blue-700 mr-2"><FaEdit /></button>
                          <button onClick={() => handleDeleteBook(book.book_id)} className="text-red-500 hover:text-red-700"><FaTrash /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'reports' && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-4 shadow-md rounded-lg">
                    <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><FaChartBar /> Most Borrowed Books</h2>
                    <ul>{reports.topBorrowed.map(item => <li key={item.title}>{item.title} ({item.borrow_count} borrows)</li>)}</ul>
                </div>
                 <div className="bg-white p-4 shadow-md rounded-lg">
                    <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><FaUsers /> Top Active Readers</h2>
                    <ul>{reports.topReaders.map(item => <li key={item.name}>{item.name} ({item.checkout_count} checkouts)</li>)}</ul>
                </div>
                <div className="bg-white p-4 shadow-md rounded-lg">
                    <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><FaBook /> Books with Low Availability</h2>
                    <ul>{reports.lowStock.map(item => <li key={item.id}>{item.title} ({item.copies} left)</li>)}</ul>
                </div>
            </div>
          )}

          {view === 'logs' && (
             <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="w-full table-auto">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Staff</th>
                      <th className="px-4 py-2 text-left">Action</th>
                      <th className="px-4 py-2 text-left">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id} className="border-t">
                        <td className="px-4 py-2">{log.staff_name}</td>
                        <td className="px-4 py-2">{log.action}</td>
                        <td className="px-4 py-2">{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          )}
        </>
      )}

      {/* Book Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">{isEditing ? 'Edit Book' : 'Add Book'}</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Title" value={currentBook.title} onChange={e => setCurrentBook({...currentBook, title: e.target.value})} className="w-full border p-2 rounded"/>
              <input type="text" placeholder="Genre" value={currentBook.genre} onChange={e => setCurrentBook({...currentBook, genre: e.target.value})} className="w-full border p-2 rounded"/>
              <input type="number" placeholder="Publisher ID" value={currentBook.publisher_id} onChange={e => setCurrentBook({...currentBook, publisher_id: parseInt(e.target.value)})} className="w-full border p-2 rounded"/>
              <input type="number" placeholder="Copies" value={currentBook.copies} onChange={e => setCurrentBook({...currentBook, copies: parseInt(e.target.value)})} className="w-full border p-2 rounded"/>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
              <button onClick={handleSaveBook} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}