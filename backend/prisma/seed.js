const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const booksData = [
    { title: 'To Kill a Mockingbird', copies: 5, author: 'Harper Lee' },
    { title: '1984', copies: 3, author: 'George Orwell' },
    { title: 'The Great Gatsby', copies: 4, author: 'F. Scott Fitzgerald' },
    { title: 'Pride and Prejudice', copies: 2, author: 'Jane Austen' },
    { title: 'The Catcher in the Rye', copies: 6, author: 'J.D. Salinger' },
    { title: 'The Hobbit', copies: 7, author: 'J.R.R. Tolkien' },
    { title: 'Fahrenheit 451', copies: 3, author: 'Ray Bradbury' },
    { title: 'Brave New World', copies: 4, author: 'Aldous Huxley' },
    { title: 'Moby-Dick', copies: 2, author: 'Herman Melville' },
    { title: 'Jane Eyre', copies: 5, author: 'Charlotte Brontë' },
    { title: 'The Lord of the Rings', copies: 3, author: 'J.R.R. Tolkien' },
    { title: 'Animal Farm', copies: 6, author: 'George Orwell' },
    { title: 'Little Women', copies: 4, author: 'Louisa May Alcott' },
    { title: 'Wuthering Heights', copies: 3, author: 'Emily Brontë' },
    { title: 'The Alchemist', copies: 7, author: 'Paulo Coelho' },
    { title: 'A Tale of Two Cities', copies: 5, author: 'Charles Dickens' },
    { title: 'The Picture of Dorian Gray', copies: 3, author: 'Oscar Wilde' },
    { title: 'Crime and Punishment', copies: 2, author: 'Fyodor Dostoevsky' },
    { title: 'The Brothers Karamazov', copies: 4, author: 'Fyodor Dostoevsky' },
    { title: 'Great Expectations', copies: 6, author: 'Charles Dickens' },
  ];

  for (const book of booksData) {
    const author = await prisma.author.upsert({
      where: { name: book.author },
      update: {},
      create: { name: book.author },
    });

    const createdBook = await prisma.book.create({
      data: {
        title: book.title,
        genre: 'Fiction',
        publisher: 'Classic Publisher',
        copies: book.copies,
      },
    });

    await prisma.bookAuthor.create({
      data: {
        bookId: createdBook.id,
        authorId: author.id,
      },
    });
  }

  console.log('✅ Seeded 20 books with author connections');
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
