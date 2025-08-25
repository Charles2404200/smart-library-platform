// src/services/borrow.service.js

async function borrowBook(db, userId, bookId, borrowAt, dueAt) {
  const [resultSets] = await db.query('CALL BorrowBook(?, ?, ?, ?)', [
    userId,
    Number(bookId),
    new Date(borrowAt),
    new Date(dueAt),
  ]);

  return Array.isArray(resultSets) && Array.isArray(resultSets[0]) && resultSets[0][0]
    ? resultSets[0][0] // { book_id, available_copies }
    : null;
}

async function returnBook(db, checkoutId) {
  const [resultSets] = await db.query('CALL ReturnBook(?)', [Number(checkoutId)]);

  return Array.isArray(resultSets) && Array.isArray(resultSets[0]) && resultSets[0][0]
    ? resultSets[0][0] // { book_id, available_copies, isLate }
    : null;
}

async function getMyBorrows(db, userId) {
  const [rows] = await db.query(
    `SELECT
       c.id       AS checkoutId,
       c.bookId   AS bookId,       -- 👈 add this line
       b.title,
       c.checkoutAt,
       c.dueAt,
       c.returnAt,
       (c.returnAt IS NULL AND c.dueAt IS NOT NULL AND NOW() > c.dueAt) AS overdue,
       c.isLate
     FROM checkout c
     JOIN books b ON b.book_id = c.bookId
     WHERE c.userId = ?
     ORDER BY c.checkoutAt DESC`,
    [userId]
  );
  return rows;
}

module.exports = {
  borrowBook,
  returnBook,
  getMyBorrows,
};
