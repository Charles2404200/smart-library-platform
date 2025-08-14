-- Publishers
INSERT INTO publishers (publisher_id, name, address) VALUES
(1, 'Penguin Random House', 'New York'),
(2, 'HarperCollins', 'London'),
(3, 'Simon & Schuster', 'Los Angeles'),
(4, 'Oxford University Press', 'Oxford'),
(5, 'Macmillan Publishers', 'Berlin');

-- Users (seed)
INSERT INTO users (id, name, email, password, role) VALUES
(1, 'Admin One',  'admin@library.com',  '$2a$12$lYzh5mzfi15efQzLxQiiguOpFHyfOkn66/qBh7aQRYaX5mJ9S7Yre', 'admin'),
(2, 'Reader Two', 'reader2@example.com', '$2a$10$dummyhash', 'reader'),
(3, 'Staff Three','staff3@example.com',  '$2a$10$dummyhash', 'staff');

-- Authors
INSERT INTO authors (author_id, name) VALUES
(1, 'George Orwell'),
(2, 'J.K. Rowling'),
(3, 'Jane Austen'),
(4, 'Mark Twain'),
(5, 'F. Scott Fitzgerald'),
(6, 'Ernest Hemingway'),
(7, 'Leo Tolstoy'),
(8, 'Agatha Christie'),
(9, 'J.R.R. Tolkien'),
(10, 'Stephen King');

-- Books
INSERT INTO books (book_id, title, genre, publisher_id, copies, available_copies) VALUES
(1, '1984', 'Dystopian', 1, 5, 5),
(2, 'Harry Potter and the Sorcerer''s Stone', 'Fantasy', 2, 10, 8),
(3, 'Pride and Prejudice', 'Romance', 3, 7, 6),
(4, 'Adventures of Huckleberry Finn', 'Adventure', 2, 4, 4),
(5, 'The Great Gatsby', 'Classic', 1, 6, 5),
(6, 'The Old Man and the Sea', 'Classic', 3, 3, 3),
(7, 'War and Peace', 'Historical', 4, 4, 4),
(8, 'Murder on the Orient Express', 'Mystery', 4, 6, 6),
(9, 'The Hobbit', 'Fantasy', 5, 8, 8),
(10, 'The Shining', 'Horror', 5, 5, 4),
(11, 'Animal Farm', 'Satire', 1, 6, 6),
(12, 'Harry Potter and the Chamber of Secrets', 'Fantasy', 2, 9, 8),
(13, 'Emma', 'Romance', 3, 5, 5),
(14, 'A Farewell to Arms', 'Classic', 3, 4, 4),
(15, 'The Lord of the Rings', 'Fantasy', 5, 10, 9),
(16, 'The Casual Vacancy', 'Drama', 2, 3, 3),
(17, 'Carrie', 'Horror', 5, 5, 5),
(18, 'The Murder of Roger Ackroyd', 'Mystery', 4, 5, 5),
(19, 'Sense and Sensibility', 'Romance', 3, 5, 5),
(20, 'For Whom the Bell Tolls', 'Classic', 3, 4, 3);

-- BookAuthor mapping (many-to-many)
INSERT INTO book_authors (book_id, author_id) VALUES
(1, 1),
(2, 2),
(3, 3),
(4, 4),
(5, 5),
(6, 6),
(7, 7),
(8, 8),
(9, 9),
(10, 10),
(11, 1),
(12, 2),
(13, 3),
(14, 6),
(15, 9),
(16, 2),
(17, 10),
(18, 8),
(19, 3),
(20, 6);
