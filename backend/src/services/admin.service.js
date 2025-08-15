// src/services/admin.service.js
async function upsertPublisherByName(conn, name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;

  const [found] = await conn.query(
    'SELECT publisher_id FROM publishers WHERE name = ? LIMIT 1',
    [trimmed]
  );
  if (found.length) return found[0].publisher_id;

  const [maxRow] = await conn.query('SELECT COALESCE(MAX(publisher_id), 0) AS maxId FROM publishers');
  const newId = (maxRow[0]?.maxId || 0) + 1;

  await conn.query(
    'INSERT INTO publishers (publisher_id, name, address) VALUES (?, ?, NULL)',
    [newId, trimmed]
  );
  return newId;
}

async function upsertAuthorByName(conn, name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;

  const [found] = await conn.query(
    'SELECT author_id FROM authors WHERE name = ? LIMIT 1',
    [trimmed]
  );
  if (found.length) return found[0].author_id;

  const [maxRow] = await conn.query('SELECT COALESCE(MAX(author_id), 0) AS maxId FROM authors');
  const newId = (maxRow[0]?.maxId || 0) + 1;

  await conn.query('INSERT INTO authors (author_id, name) VALUES (?, ?)', [newId, trimmed]);
  return newId;
}

module.exports = {
  upsertAuthorByName,
  upsertPublisherByName,
};
