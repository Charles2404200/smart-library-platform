import React, { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const [books, setBooks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
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
  const [newCoverFile, setNewCoverFile] = useState(null);    // file for new book
  const [newCoverPreview, setNewCoverPreview] = useState(''); // local preview

  const token = localStorage.getItem('token');

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
      // When backend sends HTML for 404/500, show text; otherwise try JSON error
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


  useEffect(() => {
    fetchBooks();
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              ? {
                  ...b,
                  copies: data.updated.copies,
                  available_copies: data.updated.available_copies,
                }
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
              ? {
                  ...b,
                  copies: data.updated.copies,
                  available_copies: data.updated.available_copies,
                }
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
      // 1) create book
      const payload = {
        book_id: form.book_id ? Number(form.book_id) : undefined,
        title: form.title,
        genre: form.genre,
        copies: Number(form.copies),
        // free-typed, allow comma-separated
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

      // 2) optional: upload cover if chosen
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
          console.error('❌ Cover upload failed:', upData);
          alert(upData.error || 'Cover upload failed');
        }
      }

      // reset & refresh
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
      // refresh or optimistic update
      setBooks(prev =>
        prev.map(b => b.book_id === book.book_id ? { ...b, image_url: data.image_url || b.image_url } : b)
      );
    } catch (e) {
      console.error('❌ Row cover upload error:', e);
    } finally {
      setUploadingRow(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <h1 className="text-3xl font-bold text-indigo-700">🛠 Admin Panel</h1>

      {/* Add Book */}
      <div className="bg-white border rounded-xl shadow p-5">
        <h2 className="text-xl font-semibold mb-4">➕ Add New Book</h2>
        <form onSubmit={handleAddBook} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <input
            className="border rounded p-2 col-span-2"
            placeholder="Book ID (optional)"
            value={form.book_id}
            onChange={(e) => setForm({ ...form, book_id: e.target.value })}
          />
          <input
            className="border rounded p-2 col-span-3"
            placeholder="Title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            className="border rounded p-2 col-span-2"
            placeholder="Genre"
            required
            value={form.genre}
            onChange={(e) => setForm({ ...form, genre: e.target.value })}
          />
          <input
            className="border rounded p-2 col-span-5"
            placeholder="Authors (comma separated)"
            value={authorsCsv}
            onChange={(e) => setAuthorsCsv(e.target.value)}
          />
          <input
            className="border rounded p-2 col-span-5"
            placeholder="Publishers (comma separated)"
            value={publishersCsv}
            onChange={(e) => setPublishersCsv(e.target.value)}
          />
          <input
            type="number"
            min="0"
            className="border rounded p-2 col-span-2"
            placeholder="Copies"
            required
            value={form.copies}
            onChange={(e) => setForm({ ...form, copies: e.target.value })}
          />

          {/* Cover upload for new book */}
          <div className="col-span-4 flex items-center gap-3">
            <label className="text-sm text-gray-700 shrink-0">Cover:</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setNewCoverFile(f);
                if (f) {
                  const url = URL.createObjectURL(f);
                  setNewCoverPreview(url);
                } else {
                  setNewCoverPreview('');
                }
              }}
            />
            {newCoverPreview && (
              <img
                src={newCoverPreview}
                alt="preview"
                className="h-14 w-10 object-cover rounded border"
              />
            )}
          </div>

          <button
            disabled={adding}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded px-4 py-2 col-span-2"
          >
            {adding ? 'Adding…' : 'Add'}
          </button>

          <p className="text-xs text-gray-500 col-span-full">
            Tip: enter multiple names separated by commas. The first publisher is treated as the primary one.
          </p>
        </form>
      </div>

      {/* Books Table */}
      <div className="bg-white border rounded-xl shadow p-5">
        <h2 className="text-xl font-semibold mb-4">📚 Books</h2>
        {loadingBooks ? (
          <p className="text-gray-500">Loading books…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border border-gray-300 shadow-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-left">Cover</th>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Title</th>
                  <th className="px-3 py-2 text-left">Genre</th>
                  <th className="px-3 py-2 text-left">Authors</th>
                  <th className="px-3 py-2 text-left">Publishers</th>
                  <th className="px-3 py-2 text-left">Available / Total</th>
                  <th className="px-3 py-2 text-left">Adjust Copies</th>
                  <th className="px-3 py-2 text-left">Adjust Available</th>
                  <th className="px-3 py-2 text-left">Change Cover</th>
                </tr>
              </thead>
              <tbody>
                {books.map((b) => (
                  <tr key={b.book_id} className="border-t align-top">
                    <td className="px-3 py-2">
                      {b.image_url ? (
                        <img
                          src={b.image_url.startsWith('http') ? b.image_url : `http://localhost:4000${b.image_url}`}
                          alt={b.title}
                          className="h-16 w-12 object-cover rounded border"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      ) : (
                        <div className="h-16 w-12 bg-gray-100 border rounded flex items-center justify-center text-xs text-gray-500">
                          No image
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">{b.book_id}</td>
                    <td className="px-3 py-2">{b.title}</td>
                    <td className="px-3 py-2">{b.genre}</td>
                    <td className="px-3 py-2">{b.authors || '-'}</td>
                    <td className="px-3 py-2">{b.publishers || b.primary_publisher || '-'}</td>
                    <td className="px-3 py-2 font-medium">
                      {b.available_copies} / {b.copies}
                    </td>

                    {/* Adjust total copies */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          className="border rounded p-1 w-24"
                          value={getEditedCopies(b)}
                          onChange={(e) =>
                            setEditedCopies((prev) => ({
                              ...prev,
                              [b.book_id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAdjustCopies(b.book_id, e.currentTarget.value);
                            }
                          }}
                        />
                        <button
                          className="bg-slate-700 hover:bg-slate-800 text-white rounded px-3 py-1"
                          onClick={() => handleAdjustCopies(b.book_id, getEditedCopies(b))}
                        >
                          Save
                        </button>
                      </div>
                    </td>

                    {/* Adjust available copies */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          className="border rounded p-1 w-24"
                          value={getEditedAvail(b)}
                          onChange={(e) =>
                            setEditedAvail((prev) => ({
                              ...prev,
                              [b.book_id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAdjustAvailable(b.book_id, e.currentTarget.value);
                            }
                          }}
                        />
                        <button
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-3 py-1"
                          onClick={() => handleAdjustAvailable(b.book_id, getEditedAvail(b))}
                        >
                          Save
                        </button>
                      </div>
                    </td>

                    {/* Change / upload cover */}
                    <td className="px-3 py-2">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleRowCoverChange(b, f);
                          }}
                          disabled={uploadingRow === b.book_id}
                        />
                        {uploadingRow === b.book_id && (
                          <span className="text-sm text-gray-500">Uploading…</span>
                        )}
                      </label>
                    </td>
                  </tr>
                ))}
                {books.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-gray-500" colSpan="10">
                      No books
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Staff Logs */}
      <div className="bg-white border rounded-xl shadow p-5">
        <h2 className="text-xl font-semibold mb-4">🧾 Staff Logs</h2>
        {loadingLogs ? (
          <p className="text-gray-500">Loading logs…</p>
        ) : logs.length === 0 ? (
          <p className="text-gray-500">No staff actions logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border border-gray-300 shadow-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Staff</th>
                  <th className="px-3 py-2 text-left">Action</th>
                  <th className="px-3 py-2 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t">
                    <td className="px-3 py-2">{log.id}</td>
                    <td className="px-3 py-2">{log.staff_name}</td>
                    <td className="px-3 py-2">{log.action}</td>
                    <td className="px-3 py-2">
                      {new Date(log.createdAt).toLocaleString()}
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
