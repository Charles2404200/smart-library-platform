// src/components/admin/BooksTable.jsx
import React from 'react';

/**
 * BooksTable
 * Props:
 *  - books: Array<Book>
 *  - loading: boolean
 *  - q: string (search query)
 *  - onQuery: (q: string) => void
 *  - editedCopies: Record<book_id, number>
 *  - editedAvail:  Record<book_id, number>
 *  - setEditedCopies: (fn) => void
 *  - setEditedAvail:  (fn) => void
 *  - onSaveCopies: (bookId: number, copies: number) => Promise<void>
 *  - onSaveAvailable: (bookId: number, available: number) => Promise<void>
 *  - onUploadCover: (bookId: number, file: File) => Promise<void>
 *  - uploadingRow: number | null
 *  - onRetire?: (bookId: number) => Promise<void>
 *  - onUnretire?: (bookId: number) => Promise<void>
 */
export default function BooksTable({
  books = [],
  loading = false,
  q = '',
  onQuery,
  editedCopies = {},
  editedAvail = {},
  setEditedCopies,
  setEditedAvail,
  onSaveCopies,
  onSaveAvailable,
  onUploadCover,
  uploadingRow,
  onRetire,
  onUnretire,
}) {
  // --- Helpers to read edited values (fall back to server values)
  const getEditedCopies = (b) => (editedCopies?.[b.book_id] ?? b.copies ?? 0);
  const getEditedAvail  = (b) => (editedAvail?.[b.book_id]  ?? b.available_copies ?? 0);

  // --- Client-side filter (kept from existing behavior)
  const filtered = React.useMemo(() => {
    if (!Array.isArray(books)) return [];
    if (!q || !q.trim()) return books;
    const s = q.toLowerCase();
    return books.filter((b) =>
      String(b.book_id ?? '').includes(s) ||
      String(b.title ?? '').toLowerCase().includes(s) ||
      String(b.genre ?? '').toLowerCase().includes(s) ||
      String(b.authors ?? '').toLowerCase().includes(s) ||
      String(b.publishers ?? '').toLowerCase().includes(s)
    );
  }, [books, q]);

  // --- Pagination
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(24);
  const totalItems = filtered.length;
  const pageCount  = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (page - 1) * pageSize;
  const endIndex   = Math.min(totalItems, startIndex + pageSize);
  const paged      = React.useMemo(
    () => filtered.slice(startIndex, startIndex + pageSize),
    [filtered, startIndex, pageSize]
  );

  // Reset to first page when dataset or search changes
  React.useEffect(() => { setPage(1); }, [q, books]);

  const handleCopiesChange = (b, val) => {
    const n = Number(val);
    setEditedCopies?.((prev) => ({ ...(prev || {}), [b.book_id]: Number.isFinite(n) ? n : 0 }));
  };
  const handleAvailChange = (b, val) => {
    const n = Number(val);
    setEditedAvail?.((prev) => ({ ...(prev || {}), [b.book_id]: Number.isFinite(n) ? n : 0 }));
  };

  const handleCoverSelect = (b, file) => {
    if (!file) return;
    onUploadCover?.(b.book_id, file);
  };

  return (
    <div className="bg-white border rounded-xl shadow p-5">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-xl font-semibold">📚 Books</h2>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => onQuery?.(e.target.value)}
            placeholder="Search by id / title / genre / author / publisher…"
            className="border rounded px-3 py-2 w-72"
            aria-label="Search books"
          />
          <select
            className="border rounded px-2 py-2"
            value={pageSize}
            onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }}
            aria-label="Rows per page"
          >
            {[10, 20, 24, 30, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading books…</p>
      ) : totalItems === 0 ? (
        <p className="text-gray-500">No books found.</p>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Page {page} / {pageCount} · Showing {startIndex + 1}–{endIndex} of {totalItems}
            </span>
            <div className="space-x-2">
              <button
                className="px-3 py-1 border rounded disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                className="px-3 py-1 border rounded disabled:opacity-50"
                disabled={page >= pageCount}
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
              >
                Next
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border border-gray-300 shadow-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Cover</th>
                  <th className="px-3 py-2 text-left">Title / Genre</th>
                  <th className="px-3 py-2 text-left">Authors</th>
                  <th className="px-3 py-2 text-left">Publishers</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Copies</th>
                  <th className="px-3 py-2 text-left">Available</th>
                  <th className="px-3 py-2 text-left">Upload Cover</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((b) => {
                  const isRetired = !!(b.retired === 1 || b.retired === true || b.retired === '1');
                  return (
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
                        <div className="text-xs text-gray-600">{b.genre}</div>
                      </td>
                      <td className="px-3 py-2 text-sm">{b.authors || '-'}</td>
                      <td className="px-3 py-2 text-sm">{b.publishers || '-'}</td>

                      {/* Status badge with original colors */}
                      <td className="px-3 py-2">
                        {isRetired ? (
                          <span className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded bg-red-100 text-red-700 border border-red-200">
                            Retired
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            value={getEditedCopies(b)}
                            onChange={(e) => handleCopiesChange(b, e.target.value)}
                            className="border rounded px-2 py-1 w-24"
                            aria-label={`Copies for ${b.title}`}
                            disabled={isRetired}
                          />
                          <button
                            onClick={() => onSaveCopies?.(b.book_id, getEditedCopies(b))}
                            className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                            disabled={isRetired}
                            title={isRetired ? 'Book is retired' : undefined}
                          >
                            Save
                          </button>
                        </div>
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            value={getEditedAvail(b)}
                            onChange={(e) => handleAvailChange(b, e.target.value)}
                            className="border rounded px-2 py-1 w-24"
                            aria-label={`Available copies for ${b.title}`}
                            disabled={isRetired}
                          />
                          <button
                            onClick={() => onSaveAvailable?.(b.book_id, getEditedAvail(b))}
                            className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                            disabled={isRetired}
                            title={isRetired ? 'Book is retired' : undefined}
                          >
                            Save
                          </button>
                        </div>
                      </td>

                      <td className="px-3 py-2">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleCoverSelect(b, e.target.files?.[0])}
                            disabled={uploadingRow === b.book_id || isRetired}
                          />
                          <span className="px-3 py-1 border rounded hover:bg-gray-50">
                            {uploadingRow === b.book_id ? 'Uploading…' : 'Choose image'}
                          </span>
                        </label>
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {isRetired ? (
                            <button
                              className="px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700"
                              onClick={() => onUnretire?.(b.book_id)}
                            >
                              Unretire
                            </button>
                          ) : (
                            <button
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                              onClick={() => onRetire?.(b.book_id)}
                            >
                              Retire
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Page {page} / {pageCount} · Showing {startIndex + 1}–{endIndex} of {totalItems}
            </span>
            <div className="space-x-2">
              <button
                className="px-3 py-1 border rounded disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                className="px-3 py-1 border rounded disabled:opacity-50"
                disabled={page >= pageCount}
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
