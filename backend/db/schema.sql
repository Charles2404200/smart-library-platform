-- Optional: recreate database
CREATE DATABASE IF NOT EXISTS defaultdb;
USE defaultdb;

-- ✅ DROP TABLES in correct order (foreign keys require this)
DROP TABLE IF EXISTS StaffLog;
DROP TABLE IF EXISTS Review;
DROP TABLE IF EXISTS Checkout;
DROP TABLE IF EXISTS BookAuthors;
DROP TABLE IF EXISTS Books;
DROP TABLE IF EXISTS Authors;
DROP TABLE IF EXISTS Publishers;
DROP TABLE IF EXISTS Users;

-- ✅ Users table
CREATE TABLE Users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('reader', 'staff', 'admin') NOT NULL DEFAULT 'reader'
);

-- ✅ Publishers table
CREATE TABLE Publishers (
  publisher_id INT PRIMARY KEY,
  name VARCHAR(100),
  address VARCHAR(255)
);

-- ✅ Authors table
CREATE TABLE Authors (
  author_id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

-- ✅ Books table
CREATE TABLE Books (
  book_id INT PRIMARY KEY,
  title VARCHAR(255),
  genre VARCHAR(100),
  publisher_id INT,
  copies INT DEFAULT 1,
  available_copies INT DEFAULT 1,
  FOREIGN KEY (publisher_id) REFERENCES Publishers(publisher_id)
);

-- ✅ BookAuthors table (many-to-many)
CREATE TABLE BookAuthors (
  book_id INT,
  author_id INT,
  PRIMARY KEY (book_id, author_id),
  FOREIGN KEY (book_id) REFERENCES Books(book_id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES Authors(author_id) ON DELETE CASCADE
);

-- ✅ Checkout table
CREATE TABLE Checkout (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT,
  bookId INT,
  checkoutAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  returnAt DATETIME,
  isLate BOOLEAN,
  FOREIGN KEY (userId) REFERENCES Users(id),
  FOREIGN KEY (bookId) REFERENCES Books(book_id)
);

-- ✅ Review table
CREATE TABLE Review (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT,
  bookId INT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES Users(id),
  FOREIGN KEY (bookId) REFERENCES Books(book_id)
);

-- ✅ StaffLog table
CREATE TABLE StaffLog (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staffId INT,
  action VARCHAR(255),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staffId) REFERENCES Users(id)
);
