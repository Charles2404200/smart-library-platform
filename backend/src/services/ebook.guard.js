async function hasActiveBorrow(db, userId, bookId) {
  const [rows] = await db.query(
    `SELECT 1 FROM checkout WHERE userId=? AND bookId=? AND returnAt IS NULL LIMIT 1`,
    [Number(userId), Number(bookId)]
  );
  return rows.length > 0;
}

async function fetchBookFilePath(db, bookId) {
  const [rows] = await db.query(`SELECT file_path FROM books WHERE book_id=? LIMIT 1`, [Number(bookId)]);
  return rows[0]?.file_path || null;
}

module.exports = { hasActiveBorrow, fetchBookFilePath };
