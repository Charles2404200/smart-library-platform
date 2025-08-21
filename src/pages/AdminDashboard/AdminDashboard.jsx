// src/pages/admin/AdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import AdminReports from '../../components/admin/AdminReports';
import AddBookForm from '../../components/admin/AddBookForm';
import BooksTable from '../../components/admin/BooksTable';
import StaffLogsTable from '../../components/admin/StaffLogsTable';
import UsersTable from '../../components/admin/UsersTable';
import * as adminApi from '../../services/adminService';

export default function AdminDashboard() {
  const [books, setBooks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);

  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [adding, setAdding] = useState(false);

  const [editedCopies, setEditedCopies] = useState({});
  const [editedAvail, setEditedAvail] = useState({});
  const [uploadingRow, setUploadingRow] = useState(null);
  const [q, setQ] = useState('');

  // ------- load data -------
  const loadBooks = async () => {
    setLoadingBooks(true);
    try {
      const data = await adminApi.getBooks();
      setBooks(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('❌ Fetch books error:', e);
      setBooks([]);
    } finally {
      setLoadingBooks(false);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await adminApi.getLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('❌ Fetch logs error:', e);
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await adminApi.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('❌ Fetch users error:', e);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadBooks();
    loadLogs();
    loadUsers();
  }, []);

  // ------- actions -------
  const onSaveCopies = async (bookId, copies) => {
    try {
      const data = await adminApi.updateCopies(bookId, copies);
      if (data?.updated) {
        setBooks(prev => prev.map(b =>
          b.book_id === bookId ? { ...b, ...data.updated } : b
        ));
      } else {
        await loadBooks();
      }
      setEditedCopies(prev => {
        const n = { ...prev }; delete n[bookId]; return n;
      });
    } catch (e) {
      alert(e.message || 'Failed to update copies');
    }
  };

  const onSaveAvailable = async (bookId, available) => {
    try {
      const data = await adminApi.updateAvailable(bookId, available);
      if (data?.updated) {
        setBooks(prev => prev.map(b =>
          b.book_id === bookId ? { ...b, ...data.updated } : b
        ));
      } else {
        await loadBooks();
      }
      setEditedAvail(prev => {
        const n = { ...prev }; delete n[bookId]; return n;
      });
    } catch (e) {
      alert(e.message || 'Failed to update available');
    }
  };

  const onUploadCover = async (book, file) => {
    if (!file) return;
    setUploadingRow(book.book_id);
    try {
      const up = await adminApi.uploadBookImage(book.book_id, file);
      setBooks(prev => prev.map(b => b.book_id === book.book_id
        ? { ...b, image_url: up.image_url || b.image_url }
        : b
      ));
    } catch (e) {
      alert(e.message || 'Failed to upload image');
    } finally {
      setUploadingRow(null);
    }
  };

  const onAddBook = async (payload, coverFile) => {
    setAdding(true);
    try {
      const res = await adminApi.addBook(payload); // { book_id }
      if (coverFile && res?.book_id != null) {
        try {
          await adminApi.uploadBookImage(res.book_id, coverFile);
        } catch (e) {
          alert(e.message || 'Cover upload failed');
        }
      }
      await Promise.all([loadBooks(), loadLogs()]);
    } catch (e) {
      alert(e.message || 'Failed to add book');
    } finally {
      setAdding(false);
    }
  };

  const onChangeRole = async (userId, role) => {
    try {
      const data = await adminApi.changeUserRole(userId, role);
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role: data.role ?? role } : u)));
      await loadLogs();
    } catch (e) {
      alert(e.message || 'Failed to update role');
    }
  };

  // NEW: Retire / Unretire handlers
  const onRetire = async (bookId) => {
    try {
      await adminApi.retireBook(bookId);
      setBooks(prev => prev.map(b =>
        b.book_id === bookId ? { ...b, retired: 1 } : b
      ));
      await loadLogs();
    } catch (e) {
      alert(e.message || 'Failed to retire book');
    }
  };

  const onUnretire = async (bookId) => {
    try {
      await adminApi.unretireBook(bookId);
      setBooks(prev => prev.map(b =>
        b.book_id === bookId ? { ...b, retired: 0 } : b
      ));
      await loadLogs();
    } catch (e) {
      alert(e.message || 'Failed to unretire book');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <h1 className="text-3xl font-bold text-indigo-700">🛠 Admin Panel</h1>

      {/* ADMIN REPORTS: inserted above AddBookForm as requested */}
      <AdminReports />

      <AddBookForm onSubmit={onAddBook} adding={adding} />

      <BooksTable
        books={books}
        loading={loadingBooks}
        q={q}
        onQuery={setQ}
        editedCopies={editedCopies}
        editedAvail={editedAvail}
        setEditedCopies={setEditedCopies}
        setEditedAvail={setEditedAvail}
        onSaveCopies={onSaveCopies}
        onSaveAvailable={onSaveAvailable}
        onUploadCover={onUploadCover}
        uploadingRow={uploadingRow}

        // NEW
        onRetire={onRetire}
        onUnretire={onUnretire}
      />

      <StaffLogsTable logs={logs} loading={loadingLogs} />
      <UsersTable users={users} loading={loadingUsers} onChangeRole={onChangeRole} />
    </div>
  );
}
