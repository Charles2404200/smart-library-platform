import React, { useEffect, useState } from 'react';

export default function AddBookForm({
  onSubmit, // (formPayload, newCoverFile) => Promise<void>
  adding,
}) {
  const [form, setForm] = useState({ book_id: '', title: '', genre: '', copies: 1 });
  const [authorsCsv, setAuthorsCsv] = useState('');
  const [publishersCsv, setPublishersCsv] = useState('');
  const [newCoverFile, setNewCoverFile] = useState(null);
  const [newCoverPreview, setNewCoverPreview] = useState('');

  useEffect(() => {
    if (!newCoverFile) { setNewCoverPreview(''); return; }
    const url = URL.createObjectURL(newCoverFile);
    setNewCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [newCoverFile]);

  const reset = () => {
    setForm({ book_id: '', title: '', genre: '', copies: 1 });
    setAuthorsCsv('');
    setPublishersCsv('');
    setNewCoverFile(null);
    setNewCoverPreview('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      book_id: form.book_id ? Number(form.book_id) : undefined,
      title: form.title,
      genre: form.genre,
      copies: Number(form.copies),
      authors: authorsCsv.split(',').map(s => s.trim()).filter(Boolean),
      publishers: publishersCsv.split(',').map(s => s.trim()).filter(Boolean),
    };
    await onSubmit(payload, newCoverFile);
    reset();
  };

  return (
    <div className="bg-white border rounded-xl shadow p-5">
      <h2 className="text-xl font-semibold mb-4">➕ Add New Book</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <img src={newCoverPreview} alt="preview" className="h-24 w-16 object-cover rounded border" />
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
  );
}
