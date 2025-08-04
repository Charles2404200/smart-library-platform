// controllers/borrow.controller.js
const prisma = require('../prisma/client');

exports.borrowBook = async (req, res) => {
  const { userId, bookId } = req.body;

  if (!userId || !bookId) {
    return res.status(400).json({ message: 'userId and bookId are required.' });
  }

  try {
    await prisma.$executeRaw`CALL BorrowBook(${userId}, ${bookId})`;
    return res.status(200).json({ message: 'Book borrowed successfully.' });
  } catch (err) {
    if (err.code === 'ER_SIGNAL_EXCEPTION') {
      // This catches SIGNAL SQLSTATE '45000' inside procedure
      return res.status(400).json({ message: err.sqlMessage || 'Borrowing failed.' });
    }
    console.error('Error borrowing book:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
