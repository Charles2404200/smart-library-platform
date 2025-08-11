-- Temporarily disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

--  Drop tables in reverse dependency order
DROP TABLE IF EXISTS staff_log;
DROP TABLE IF EXISTS review;
DROP TABLE IF EXISTS checkout;
DROP TABLE IF EXISTS book_authors;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS authors;
DROP TABLE IF EXISTS publishers;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- Users table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('reader', 'staff', 'admin') NOT NULL DEFAULT 'reader'
);

-- Publishers table
CREATE TABLE publishers (
  publisher_id INT PRIMARY KEY,
  name VARCHAR(100),
  address VARCHAR(255)
);

--  Authors table
CREATE TABLE authors (
  author_id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

-- Books table
CREATE TABLE books (
  book_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255),
  genre VARCHAR(100),
  publisher_id INT,
  copies INT DEFAULT 1,
  available_copies INT DEFAULT 1,
  CONSTRAINT fk_books_publisher FOREIGN KEY (publisher_id) REFERENCES publishers(publisher_id)
);

-- Many-to-many relationship table between books and authors
CREATE TABLE book_authors (
  book_id INT,
  author_id INT,
  PRIMARY KEY (book_id, author_id),
  CONSTRAINT fk_book_authors_book FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE,
  CONSTRAINT fk_book_authors_author FOREIGN KEY (author_id) REFERENCES authors(author_id) ON DELETE CASCADE
);

-- Book checkout table
CREATE TABLE checkout (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  book_id INT,
  checkout_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  return_at DATETIME,
  is_late BOOLEAN,
  CONSTRAINT fk_checkout_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_checkout_book FOREIGN KEY (book_id) REFERENCES books(book_id)
);

-- Review table
CREATE TABLE review (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT,
  bookId INT,
  rating INT,
  comment TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_rating_range CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_review_user FOREIGN KEY (userId) REFERENCES users(id),
  CONSTRAINT fk_review_book FOREIGN KEY (bookId) REFERENCES books(book_id)
);

-- Staff log table
CREATE TABLE staff_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staffId INT,
  action VARCHAR(255),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stafflog_user FOREIGN KEY (staffId) REFERENCES users(id)
);
