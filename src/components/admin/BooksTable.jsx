// src/components/admin/BooksTable.jsx
import React from 'react';
import { resolveImageUrl } from '../../utils/resolveImageUrl';
import { API_URL } from '../../config/env';

/**
 * Admin Books table - simplified/fully compatible upload endpoint logic
 */
export default function BooksTable({
  books = [],
  loading,
  q = '',
  onQuery,
  editedCopies = {},
  editedAvail = {},
  setEditedCopies,
  setEditedAvail,
  onSaveCopies,
  onSaveAvailable,
  onRetire,
  onUnretire,
  onUploadImage, // optional handler provided by parent
}) {
  // --- helpers / pagination (kept identical to previous) ---
  const filtered = React.useMemo(() => {
    const s = (q || '').toLowerCase().trim();
    if (!s) return books;
    return books.filter((b) =>
      String(b.book_id ?? '').includes(s) ||
      String(b.title ?? '').toLowerCase().includes(s) ||
      String(b.genre ?? '').toLowerCase().includes(s) ||
      String(b.authors ?? '').toLowerCase().includes(s) ||
      String(b.publishers ?? '').toLowerCase().includes(s)
    );
  }, [books, q]);

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
  React.useEffect(() => { setPage(1); }, [q, books]);

  // local UI state
  const [imageOverride, setImageOverride] = React.useState({}); // { book_id: image_url }
  const [uploadingId, setUploadingId] = React.useState(null);

  // debounce helpers for auto-save of copies / available
  const copiesTimers = React.useRef({});
  const availTimers  = React.useRef({});
  const DEBOUNCE_MS  = 500;

  const scheduleSaveCopies = React.useCallback((bookId, value) => {
    if (!onSaveCopies) return;
    clearTimeout(copiesTimers.current[bookId]);
    copiesTimers.current[bookId] = setTimeout(() => {
      onSaveCopies(bookId, value);
    }, DEBOUNCE_MS);
  }, [onSaveCopies]);

  const scheduleSaveAvail = React.useCallback((bookId, value) => {
    if (!onSaveAvailable) return;
    clearTimeout(availTimers.current[bookId]);
    availTimers.current[bookId] = setTimeout(() => {
      onSaveAvailable(bookId, value);
    }, DEBOUNCE_MS);
  }, [onSaveAvailable]);

  const getEditedCopies = (b) => {
    const v = editedCopies?.[b.book_id];
    return (v == null) ? (Number(b.copies ?? 0)) : v;
  };
  const getEditedAvail = (b) => {
    const v = editedAvail?.[b.book_id];
    return (v == null) ? (Number(b.available_copies ?? 0)) : v;
  };

  const handleCopiesChange = (b, val) => {
    const n = Number(val);
    const safe = Number.isFinite(n) && n >= 0 ? n : 0;
    setEditedCopies?.((prev) => ({ ...(prev || {}), [b.book_id]: safe }));
    scheduleSaveCopies?.(b.book_id, safe);
  };
  const handleAvailChange = (b, val) => {
    const n = Number(val);
    const safe = Number.isFinite(n) && n >= 0 ? n : 0;
    setEditedAvail?.((prev) => ({ ...(prev || {}), [b.book_id]: safe }));
    scheduleSaveAvail?.(b.book_id, safe);
  };

  // Build a correct upload endpoint irrespective of how API_URL is set.
  // If API_URL already ends with "/api" we avoid duplicating it.
  function buildAdminUploadUrl(bookId) {
    const base = (API_URL || '').replace(/\/+$/, ''); // strip trailing slashes
    if (!base) return `/api/admin/books/${bookId}/image`;
    if (base.endsWith('/api')) {
      return `${base}/admin/books/${bookId}/image`;
    }
    // base does not end with /api
    return `${base}/api/admin/books/${bookId}/image`;
  }

  // safe response text extraction
  async function extractErrorMessage(res) {
    try {
      const json = await res.json();
      return json?.error || json?.message || JSON.stringify(json);
    } catch {
      try { return await res.text(); } catch { return `${res.status} ${res.statusText}`; }
    }
  }

  // upload implementation: prefer onUploadImage prop, else call API directly
  const doUploadImage = React.useCallback(
    async (bookId, file) => {
      if (onUploadImage) {
        // delegate to parent if provided
        return onUploadImage(bookId, file);
      }

      const fd = new FormData();
      fd.append('image', file);

      // try to extract token (same behavior used elsewhere in app)
      let token = null;
      try {
        const raw = localStorage.getItem('token');
        if (raw) {
          const parsed = JSON.parse(raw);
          token = typeof parsed === 'string' ? parsed : (parsed?.token ?? raw);
        }
      } catch {
        token = localStorage.getItem('token');
      }

      const endpoint = buildAdminUploadUrl(bookId);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });

      if (!res.ok) {
        const msg = await extractErrorMessage(res);
        throw new Error(msg || 'Upload failed');
      }

      const data = await res.json();
      // expected: { image_url: '/uploads/books/...' } or full URL
      return data?.image_url ?? data?.url ?? null;
    },
    [onUploadImage]
  );

  // helper for rendering
  const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  return (
    <div>
      {/* top search / page size */}
      <div className="mb-3 flex items-center justify-between">
        <input
          type="text"
          value={q}
          onChange={(e) => onQuery?.(e.target.value)}
          className="border rounded px-3 py-2 w-full max-w-md"
          placeholder="Search by title, genre, author, publisher…"
          aria-label="Search books"
        />

        <div className="ml-3 flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="border rounded px-2 py-2"
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

          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-sm">
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
                  const bookId = b.book_id;
                  const isRetired = !!(b.retired === 1 || b.retired === true || b.retired === '1');
                  const img = imageOverride[bookId] || b.image_url;

                  return (
                    <tr key={bookId} className="border-t align-top">
                      <td className="px-3 py-2">{bookId}</td>

                      <td className="px-3 py-2">
                        {img ? (
                          <img
                            src={resolveImageUrl(img)}
                            alt={b.title}
                            className="h-16 w-12 object-cover rounded border"
                          />
                        ) : (
                          <div className="h-16 w-12 rounded bg-gray-50 border flex items-center justify-center text-xs text-gray-400">
                            No cover
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2">
                        <div className="font-medium">{b.title}</div>
                        <div className="text-gray-500">{b.genre || '-'}</div>
                      </td>

                      <td className="px-3 py-2 text-sm whitespace-pre-line">
                        {b.authors || '-'}
                      </td>
                      <td className="px-3 py-2 text-sm whitespace-pre-line">
                        {b.publishers || '-'}
                      </td>

                      <td className="px-3 py-2">
                        {isRetired ? (
                          <span className="inline-flex items-center px-2 py-1 text-xs rounded bg-rose-100 text-rose-700 border border-rose-200">
                            Retired
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          value={getEditedCopies(b)}
                          onChange={(e) => handleCopiesChange(b, e.target.value)}
                          onBlur={(e) => handleCopiesChange(b, e.target.value)}
                          className="border rounded px-2 py-1 w-24"
                          aria-label={`Copies for ${b.title}`}
                          disabled={isRetired}
                        />
                      </td>

                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          value={getEditedAvail(b)}
                          onChange={(e) => handleAvailChange(b, e.target.value)}
                          onBlur={(e) => handleAvailChange(b, e.target.value)}
                          className="border rounded px-2 py-1 w-24"
                          aria-label={`Available copies for ${b.title}`}
                          disabled={isRetired}
                        />
                      </td>

                      <td className="px-3 py-2">
                        <label className={`relative inline-flex items-center gap-2 ${isRetired ? 'opacity-60 cursor-not-allowed' : ''}`}>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={isRetired || uploadingId === bookId}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                setUploadingId(bookId);
                                const url = await doUploadImage(bookId, file);
                                if (url) {
                                  setImageOverride((prev) => ({ ...prev, [bookId]: url }));
                                }
                              } catch (err) {
                                // friendly alert; in dev you'll also see network error
                                // eslint-disable-next-line no-alert
                                alert(err?.message || 'Failed to upload image');
                              } finally {
                                setUploadingId((id) => (id === bookId ? null : id));
                                e.target.value = '';
                              }
                            }}
                          />
                          {uploadingId === bookId && (
                            <span className="text-xs text-gray-500">Uploading…</span>
                          )}
                        </label>
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {isRetired ? (
                            <button
                              className="px-3 py-1 border rounded hover:bg-gray-50"
                              onClick={() => onUnretire?.(bookId)}
                            >
                              Unretire
                            </button>
                          ) : (
                            <button
                              className="px-3 py-1 border rounded hover:bg-gray-50"
                              onClick={() => onRetire?.(bookId)}
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
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} / {pageCount} · Showing {startIndex + 1}–{endIndex} of {totalItems}
            </span>
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={page >= pageCount}
              onClick={() => setPage(p => Math.min(pageCount, p + 1))}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
