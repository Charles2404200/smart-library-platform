const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Lấy tất cả sách (kèm tác giả nếu cần)
const getAllBooks = async (req, res) => {
  try {
    const books = await prisma.book.findMany({
      include: {
        authors: true, // nếu có quan hệ n-n qua bảng book_authors
      },
    });
    res.json(books);
  } catch (err) {
    console.error('Error fetching books:', err);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
};

// Thêm 1 sách mới
const addBook = async (req, res) => {
  const { title, publisher_id, price, pages, author_ids } = req.body;

  try {
    const newBook = await prisma.book.create({
      data: {
        title,
        publisher_id,
        price,
        pages,
        book_authors: {
          create: author_ids.map((author_id) => ({
            author: {
              connect: { author_id },
            },
          })),
        },
      },
    });

    res.status(201).json(newBook);
  } catch (err) {
    console.error('Error adding book:', err);
    res.status(500).json({ error: 'Failed to add book' });
  }
};

module.exports = {
  getAllBooks,
  addBook,
};
