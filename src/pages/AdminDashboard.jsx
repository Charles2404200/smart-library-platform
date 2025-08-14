import React, { useEffect, useMemo, useState } from 'react';

export default function AdminDashboard() {
  const [books, setBooks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [adding, setAdding] = useState(false);

  // inline edits
  const [editedCopies, setEditedCopies] = useState({});
  const [editedAvail, setEditedAvail] = useState({});
  const getEditedCopies = (b) =>
    editedCopies[b.book_id] !== undefined ? editedCopies[b.book_id] : b.copies;
  const getEditedAvail = (b) =>
    editedAvail[b.book_id] !== undefined ? editedAvail[b.book_id] : (b.available_copies ?? 0);

  // per-row image uploading state
  const [uploadingRow, setUploadingRow] = useState(null);

  // add-book form
  const [form, setForm] = useState({
    book_id: '',
    title: '',
    genre: '',
    copies: 1,
  });
  const [authorsCsv, setAuthorsCsv] = useState('');
  const [publishersCsv, setPublishersCsv] = useState('');
  const [newCoverFile, setNewCoverFile] = useState(null);
  const [newCoverPreview, setNewCoverPreview] = useState('');

  // simple book search
  const [q, setQ] = useState('');

  const token = localStorage.getItem('token');

  // ===== fetchers =====
  const fetchBooks = async () => {
    setLoadingBooks(true);
    try {
      const res = await fetch('http://localhost:4000/api/admin/books', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBooks(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('❌ Fetch books error:', e);
      setBooks([]);
    } finally {
      setLoadingBooks(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('http://localhost:4000/api/admin/logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok) {
        const body = ct.includes('application/json') ? await res.json() : await res.text();
        const msg = typeof body === 'string' ? body : (body.error || JSON.stringify(body));
        throw new Error(`${res.status} ${msg}`);
      }
      const data = ct.includes('application/json') ? await res.json() : [];
      setLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('❌ Fetch logs error:', e);
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('http://localhost:4000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('❌ Fetch users error:', e);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchBooks();
    fetchLogs();
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== actions =====
  const handleAdjustCopies = async (book_id, newCopies) => {
    try {
      const res = await fetch(`http://localhost:4000/api/admin/books/${book_id}/copies`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ copies: Number(newCopies) }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update copies');
        return;
      }
      if (data.updated) {
        setBooks((prev) =>
          prev.map((b) =>
            b.book_id === book_id
              ? { ...b, copies: data.updated.copies, available_copies: data.updated.available_copies }
              : b
          )
        );
      } else {
        fetchBooks();
      }
      setEditedCopies((prev) => {
        const next = { ...prev };
        delete next[book_id];
        return next;
      });
    } catch (e) {
      console.error('❌ Adjust copies error:', e);
    }
  };

  const handleAdjustAvailable = async (book_id, newAvailable) => {
    try {
      const res = await fetch(`http://localhost:4000/api/admin/books/${book_id}/available`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ available: Number(newAvailable) }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update available copies');
        return;
      }
      if (data.updated) {
        setBooks((prev) =>
          prev.map((b) =>
            b.book_id === book_id
              ? { ...b, copies: data.updated.copies, available_copies: data.updated.available_copies }
              : b
          )
        );
      } else {
        fetchBooks();
      }
      setEditedAvail((prev) => {
        const next = { ...prev };
        delete next[book_id];
        return next;
      });
    } catch (e) {
      console.error('❌ Adjust available error:', e);
    }
  };

  const handleAddBook = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const payload = {
        book_id: form.book_id ? Number(form.book_id) : undefined,
        title: form.title,
        genre: form.genre,
        copies: Number(form.copies),
        authors: authorsCsv.split(',').map(s => s.trim()).filter(Boolean),
        publishers: publishersCsv.split(',').map(s => s.trim()).filter(Boolean),
      };
      const res = await fetch('http://localhost:4000/api/admin/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to add book');
        return;
      }
      const createdBookId = data.book_id;
      if (newCoverFile && createdBookId != null) {
        const fd = new FormData();
        fd.append('image', newCoverFile);
        const up = await fetch(`http://localhost:4000/api/admin/books/${createdBookId}/image`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const upData = await up.json();
        if (!up.ok) {
          alert(upData.error || 'Cover upload failed');
        }
      }
      // reset
      setForm({ book_id: '', title: '', genre: '', copies: 1 });
      setAuthorsCsv('');
      setPublishersCsv('');
      setNewCoverFile(null);
      setNewCoverPreview('');
      fetchBooks();
      fetchLogs();
    } catch (e) {
      console.error('❌ Add book error:', e);
    } finally {
      setAdding(false);
    }
  };

  const handleRowCoverChange = async (book, file) => {
    if (!file) return;
    setUploadingRow(book.book_id);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch(`http://localhost:4000/api/admin/books/${book.book_id}/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to upload image');
        return;
      }
      setBooks(prev =>
        prev.map(b => b.book_id === book.book_id ? { ...b, image_url: data.image_url || b.image_url } : b)
      );
    } catch (e) {
      console.error('❌ Row cover upload error:', e);
    } finally {
      setUploadingRow(null);
    }
  };

  const handleChangeRole = async (userId, role) => {
    try {
      const res = await fetch(`http://localhost:4000/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update role');
        return;
      }
      setUsers((prev) => prev.map(u => (u.id === userId ? { ...u, role: data.role ?? role } : u)));
      fetchLogs();
    } catch (e) {
      console.error('❌ Update role error:', e);
    }
  };

  // cover preview effect
  useEffect(() => {
    if (!newCoverFile) {
      setNewCoverPreview('');
      return;
    }
    const url = URL.createObjectURL(newCoverFile);
    setNewCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [newCoverFile]);

  const filteredBooks = useMemo(() => {
    if (!q.trim()) return books;
    const s = q.toLowerCase();
    return books.filter(b =>
      String(b.book_id).includes(s) ||
      (b.title || '').toLowerCase().includes(s) ||
      (b.genre || '').toLowerCase().includes(s)
    );
  }, [q, books]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <h1 className="text-3xl font-bold text-indigo-700">🛠 Admin Panel</h1>

      {/* Add Book Form */}
      <div className="bg-white border rounded-xl shadow p-5">
        <h2 className="text-xl font-semibold mb-4">➕ Add New Book</h2>
        <form onSubmit={handleAddBook} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Book ID (optional)</label>
            <input
              type="number"
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.book_id}
              onChange={(e) => setForm((f) => ({ ...f, book_id: e.target.value }))}
              placeholder="Leave blank for auto"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              required
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Book title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Genre</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.genre}
              onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}
              placeholder="e.g., Fiction"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Copies</label>
            <input
              type="number"
              min={0}
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.copies}
              onChange={(e) => setForm((f) => ({ ...f, copies: e.target.value }))}
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700">Authors (CSV)</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={authorsCsv}
              onChange={(e) => setAuthorsCsv(e.target.value)}
              placeholder="e.g., Alice, Bob"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700">Publishers (CSV)</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={publishersCsv}
              onChange={(e) => setPublishersCsv(e.target.value)}
              placeholder="e.g., Penguin, HarperCollins"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Cover Image</label>
            <input
              type="file"
              accept="image/*"
              className="mt-1 w-full border rounded px-3 py-2"
              onChange={(e) => setNewCoverFile(e.target.files?.[0] || null)}
            />
          </div>

          {newCoverPreview && (
            <div className="flex items-end">
              <img
                src={newCoverPreview}
                alt="preview"
                className="h-24 w-16 object-cover rounded border"
              />
            </div>
          )}

          <div className="md:col-span-3 flex gap-3">
            <button
              type="submit"
              disabled={adding}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-60"
            >
              {adding ? 'Adding…' : 'Add Book'}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm({ book_id: '', title: '', genre: '', copies: 1 });
                setAuthorsCsv('');
                setPublishersCsv('');
                setNewCoverFile(null);
                setNewCoverPreview('');
              }}
              className="px-4 py-2 bg-gray-100 border rounded hover:bg-gray-200"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Books Table */}
      <div className="bg-white border rounded-xl shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">📚 Books</h2>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by id / title / genre…"
            className="border rounded px-3 py-2 w-72"
          />
        </div>
        {loadingBooks ? (
          <p className="text-gray-500">Loading books…</p>
        ) : filteredBooks.length === 0 ? (
          <p className="text-gray-500">No books found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border border-gray-300 shadow-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Cover</th>
                  <th className="px-3 py-2 text-left">Title</th>
                  <th className="px-3 py-2 text-left">Genre</th>
                  <th className="px-3 py-2 text-left">Copies</th>
                  <th className="px-3 py-2 text-left">Available</th>
                  <th className="px-3 py-2 text-left">Upload Cover</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBooks.map((b) => (
                  <tr key={b.book_id} className="border-t align-top">
                    <td className="px-3 py-2">{b.book_id}</td>
                    <td className="px-3 py-2">
                      {b.image_url ? (
                        <img
                          src={b.image_url}
                          alt={b.title}
                          className="h-16 w-12 object-cover rounded border"
                        />
                      ) : (
                        <div className="h-16 w-12 rounded bg-gray-100 border flex items-center justify-center text-xs text-gray-400">
                          No cover
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 max-w-[22rem]">
                      <div className="font-medium">{b.title}</div>
                    </td>
                    <td className="px-3 py-2">{b.genre || '-'}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="w-24 border rounded px-2 py-1"
                        value={getEditedCopies(b)}
                        onChange={(e) =>
                          setEditedCopies((prev) => ({ ...prev, [b.book_id]: e.target.value }))
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="w-24 border rounded px-2 py-1"
                        value={getEditedAvail(b)}
                        onChange={(e) =>
                          setEditedAvail((prev) => ({ ...prev, [b.book_id]: e.target.value }))
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <label className="cursor-pointer inline-flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleRowCoverChange(b, e.target.files?.[0] || null)}
                          disabled={uploadingRow === b.book_id}
                        />
                        <span className="px-3 py-1 border rounded hover:bg-gray-50">
                          {uploadingRow === b.book_id ? 'Uploading…' : 'Choose Image'}
                        </span>
                      </label>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleAdjustCopies(b.book_id, getEditedCopies(b))}
                          className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                          Save Copies
                        </button>
                        <button
                          onClick={() => handleAdjustAvailable(b.book_id, getEditedAvail(b))}
                          className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                        >
                          Save Available
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Staff Logs Table */}
      <div className="bg-white border rounded-xl shadow p-5">
        <h2 className="text-xl font-semibold mb-4">🧾 Staff Logs</h2>
        {loadingLogs ? (
          <p className="text-gray-500">Loading logs…</p>
        ) : logs.length === 0 ? (
          <p className="text-gray-500">No logs found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border border-gray-300 shadow-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Staff</th>
                  <th className="px-3 py-2 text-left">Action</th>
                  <th className="px-3 py-2 text-left">Target</th>
                  <th className="px-3 py-2 text-left">At</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((lg) => (
                  <tr key={lg.id} className="border-t">
                    <td className="px-3 py-2">{lg.id}</td>
                    <td className="px-3 py-2">{lg.staffName || lg.staff_id || '-'}</td>
                    <td className="px-3 py-2">{lg.action || '-'}</td>
                    <td className="px-3 py-2">{lg.target || '-'}</td>
                    <td className="px-3 py-2">
                      {lg.createdAt
                        ? new Date(lg.createdAt).toLocaleString()
                        : lg.created_at
                        ? new Date(lg.created_at).toLocaleString()
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User List (with inline role change) */}
      <div className="bg-white border rounded-xl shadow p-5">
        <h2 className="text-xl font-semibold mb-4">👥 Users</h2>
        {loadingUsers ? (
          <p className="text-gray-500">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="text-gray-500">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border border-gray-300 shadow-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Role</th>
                  <th className="px-3 py-2 text-left">Change Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-3 py-2">{u.id}</td>
                    <td className="px-3 py-2">{u.name}</td>
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">{u.role}</td>
                    <td className="px-3 py-2">
                      <select
                        className="border rounded px-2 py-1"
                        defaultValue={u.role}
                        onChange={(e) => handleChangeRole(u.id, e.target.value)}
                      >
                        <option value="reader">reader</option>
                        <option value="staff">staff</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
