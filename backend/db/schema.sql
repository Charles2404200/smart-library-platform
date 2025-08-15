-- ======================================
-- Smart Library Platform - Universal Schema
-- Works on MySQL 5.7+
-- ======================================

-- Temporarily disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS staff_log;
DROP TABLE IF EXISTS review;
DROP TABLE IF EXISTS checkout;
DROP TABLE IF EXISTS book_authors;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS authors;
DROP TABLE IF EXISTS publishers;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS book_publishers;

SET FOREIGN_KEY_CHECKS = 1;

-- ======================
-- Core Tables
-- ======================

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('reader', 'staff', 'admin') NOT NULL DEFAULT 'reader'
);

CREATE TABLE publishers (
  publisher_id INT PRIMARY KEY,
  name VARCHAR(100),
  address VARCHAR(255)
);

CREATE TABLE authors (
  author_id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE books (
  book_id INT PRIMARY KEY,
  title VARCHAR(255),
  genre VARCHAR(100),
  publisher_id INT,
  copies INT DEFAULT 1,
  available_copies INT DEFAULT 1,
  image_url VARCHAR(255) NULL,
  CONSTRAINT fk_books_publisher FOREIGN KEY (publisher_id) REFERENCES publishers(publisher_id)
);

CREATE TABLE book_authors (
  book_id INT,
  author_id INT,
  PRIMARY KEY (book_id, author_id),
  CONSTRAINT fk_book_authors_book FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE,
  CONSTRAINT fk_book_authors_author FOREIGN KEY (author_id) REFERENCES authors(author_id) ON DELETE CASCADE
);

CREATE TABLE checkout (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT,
  bookId INT,
  checkoutAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  returnAt DATETIME,
  dueAt DATETIME NULL,
  isLate BOOLEAN,
  CONSTRAINT fk_checkout_user FOREIGN KEY (userId) REFERENCES users(id),
  CONSTRAINT fk_checkout_book FOREIGN KEY (bookId) REFERENCES books(book_id)
);

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

CREATE TABLE staff_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staffId INT,
  action VARCHAR(255),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stafflog_user FOREIGN KEY (staffId) REFERENCES users(id)
);

CREATE TABLE book_publishers (
  book_id INT NOT NULL,
  publisher_id INT NOT NULL,
  PRIMARY KEY (book_id, publisher_id),
  CONSTRAINT fk_bp_book FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE,
  CONSTRAINT fk_bp_pub  FOREIGN KEY (publisher_id) REFERENCES publishers(publisher_id) ON DELETE CASCADE
);

-- Backfill M2M table from main books table
INSERT IGNORE INTO book_publishers (book_id, publisher_id)
SELECT b.book_id, b.publisher_id
FROM books b
WHERE b.publisher_id IS NOT NULL;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- One review per user per book
ALTER TABLE review
  ADD UNIQUE KEY uq_review_user_book (userId, bookId);

-- Fast listing by book
CREATE INDEX ix_review_book ON review (bookId, createdAt);

-- Fast listing by user (if you plan to show "my reviews")
CREATE INDEX ix_review_user ON review (userId, createdAt);