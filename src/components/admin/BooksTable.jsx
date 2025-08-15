import React from 'react';

export default function BooksTable({
  books,
  loading,
  q,
  onQuery,
  editedCopies,
  editedAvail,
  setEditedCopies,
  setEditedAvail,
  onSaveCopies,
  onSaveAvailable,
  onUploadCover,
  uploadingRow,
}) {
  const getEditedCopies = (b) =>
    editedCopies[b.book_id] !== undefined ? editedCopies[b.book_id] : b.copies;

  const getEditedAvail = (b) =>
    editedAvail[b.book_id] !== undefined ? editedAvail[b.book_id] : (b.available_copies ?? 0);

  const filtered = React.useMemo(() => {
    if (!q.trim()) return books;
    const s = q.toLowerCase();
    return books.filter(b =>
      String(b.book_id).includes(s) ||
      (b.title || '').toLowerCase().includes(s) ||
      (b.genre || '').toLowerCase().includes(s)
    );
  }, [q, books]);

  return (
    <div className="bg-white border rounded-xl shadow p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">📚 Books</h2>
        <input
          value={q}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search by id / title / genre…"
          className="border rounded px-3 py-2 w-72"
        />
      </div>

      {loading ? (
        <p className="text-gray-500">Loading books…</p>
      ) : filtered.length === 0 ? (
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
              {filtered.map((b) => (
                <tr key={b.book_id} className="border-t align-top">
                  <td className="px-3 py-2">{b.book_id}</td>
                  <td className="px-3 py-2">
                    {b.image_url ? (
                      <img src={b.image_url} alt={b.title} className="h-16 w-12 object-cover rounded border" />
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
                      onChange={(e) => setEditedCopies((prev) => ({ ...prev, [b.book_id]: e.target.value }))}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className="w-24 border rounded px-2 py-1"
                      value={getEditedAvail(b)}
                      onChange={(e) => setEditedAvail((prev) => ({ ...prev, [b.book_id]: e.target.value }))}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <label className="cursor-pointer inline-flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => onUploadCover(b, e.target.files?.[0] || null)}
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
                        onClick={() => onSaveCopies(b.book_id, getEditedCopies(b))}
                        className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      >
                        Save Copies
                      </button>
                      <button
                        onClick={() => onSaveAvailable(b.book_id, getEditedAvail(b))}
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
  );
}
