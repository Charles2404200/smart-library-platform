// src/services/admin.service.js

/** Upsert (create if missing) a publisher by name and return publisher_id */
async function upsertPublisherByName(conn, name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;

  const [found] = await conn.query(
    'SELECT publisher_id FROM publishers WHERE name = ? LIMIT 1',
    [trimmed]
  );
  if (found.length) return found[0].publisher_id;

  const [maxRow] = await conn.query(
    'SELECT COALESCE(MAX(publisher_id), 0) AS maxId FROM publishers'
  );
  const newId = (maxRow[0]?.maxId || 0) + 1;

  await conn.query(
    'INSERT INTO publishers (publisher_id, name, address) VALUES (?, ?, NULL)',
    [newId, trimmed]
  );
  return newId;
}

/** Upsert (create if missing) an author by name and return author_id */
async function upsertAuthorByName(conn, name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;

  const [found] = await conn.query(
    'SELECT author_id FROM authors WHERE name = ? LIMIT 1',
    [trimmed]
  );
  if (found.length) return found[0].author_id;

  const [maxRow] = await conn.query(
    'SELECT COALESCE(MAX(author_id), 0) AS maxId FROM authors'
  );
  const newId = (maxRow[0]?.maxId || 0) + 1;

  await conn.query(
    'INSERT INTO authors (author_id, name) VALUES (?, ?)',
    [newId, trimmed]
  );
  return newId;
}

/* =========================
   New: retire / unretire helpers
   ========================= */

/** Set retired flag for a book. Returns true if a row was updated. */
async function setBookRetired(conn, bookId, retired) {
  const [res] = await conn.execute(
    'UPDATE books SET retired = ? WHERE book_id = ?',
    [retired ? 1 : 0, Number(bookId)]
  );
  return res.affectedRows > 0;
}

/** Convenience wrappers */
async function retireBook(conn, bookId) {
  return setBookRetired(conn, bookId, true);
}
async function unretireBook(conn, bookId) {
  return setBookRetired(conn, bookId, false);
}

/** Optional: fetch just the retired flag (for guards/UI) */
async function getBookRetiredFlag(conn, bookId) {
  const [rows] = await conn.query(
    'SELECT retired FROM books WHERE book_id = ? LIMIT 1',
    [Number(bookId)]
  );
  return rows.length ? !!rows[0].retired : null; // null = not found
}

module.exports = {
  upsertAuthorByName,
  upsertPublisherByName,
  retireBook,
  unretireBook,
  setBookRetired,
  getBookRetiredFlag,
};
