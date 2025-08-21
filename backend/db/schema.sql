-- ======================================
-- Smart Library Platform - Universal Schema (MySQL 5.7+)
-- Safe to re-run; no DELIMITER required
-- ======================================

/* --------------------------------------
   Drop (in dependency order) — optional
   Comment this whole block if you want to preserve data
--------------------------------------- */
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS staff_log;
DROP TABLE IF EXISTS review;
DROP TABLE IF EXISTS checkout;
DROP TABLE IF EXISTS book_authors;
DROP TABLE IF EXISTS book_publishers;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS authors;
DROP TABLE IF EXISTS publishers;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ======================
-- Core Tables
-- ======================

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(255) NULL, 
  role ENUM('reader','staff','admin') NOT NULL DEFAULT 'reader'
);

CREATE TABLE IF NOT EXISTS publishers (
  publisher_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  address VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS authors (
  author_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS books (
  book_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  genre VARCHAR(100),
  publisher_id INT,
  copies INT NOT NULL DEFAULT 1,
  available_copies INT NOT NULL DEFAULT 1,
  image_url VARCHAR(255) NULL,

  -- 🔹 retirement controls
  retired TINYINT(1) NOT NULL DEFAULT 0,
  retired_at DATETIME NULL,
  retired_by INT NULL,
  retired_reason VARCHAR(255) NULL,

  CONSTRAINT fk_books_publisher  FOREIGN KEY (publisher_id) REFERENCES publishers(publisher_id),
  CONSTRAINT fk_books_retired_by FOREIGN KEY (retired_by)   REFERENCES users(id),

  KEY ix_books_retired (retired)
);


CREATE TABLE IF NOT EXISTS book_authors (
  book_id INT NOT NULL,
  author_id INT NOT NULL,
  PRIMARY KEY (book_id, author_id),
  CONSTRAINT fk_book_authors_book   FOREIGN KEY (book_id)   REFERENCES books(book_id)     ON DELETE CASCADE,
  CONSTRAINT fk_book_authors_author FOREIGN KEY (author_id) REFERENCES authors(author_id) ON DELETE CASCADE
);

-- Optional: mirror M2M publishers if you want multi-publisher books
CREATE TABLE IF NOT EXISTS book_publishers (
  book_id INT NOT NULL,
  publisher_id INT NOT NULL,
  PRIMARY KEY (book_id, publisher_id),
  CONSTRAINT fk_bp_book FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE,
  CONSTRAINT fk_bp_pub  FOREIGN KEY (publisher_id) REFERENCES publishers(publisher_id) ON DELETE CASCADE
);

-- Backfill M2M from books.publisher_id if present
INSERT IGNORE INTO book_publishers (book_id, publisher_id)
SELECT b.book_id, b.publisher_id
FROM books b
WHERE b.publisher_id IS NOT NULL;

-- ======================
-- Circulation / Transactions
-- ======================

CREATE TABLE IF NOT EXISTS checkout (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  bookId INT NOT NULL,
  checkoutAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dueAt DATETIME NULL,            -- allow NULL (grace-policy fallback)
  returnAt DATETIME DEFAULT NULL,
  isLate BOOLEAN NOT NULL DEFAULT 0,
  CONSTRAINT fk_checkout_user FOREIGN KEY (userId) REFERENCES users(id),
  CONSTRAINT fk_checkout_book FOREIGN KEY (bookId) REFERENCES books(book_id),

  -- helpful indexes
  KEY ix_checkout_user_date (userId, checkoutAt),
  KEY ix_checkout_active    (returnAt, dueAt)
);

-- ======================
-- Reviews
-- ======================

CREATE TABLE IF NOT EXISTS review (
  review_id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  bookId INT NOT NULL,
  rating INT,
  comment TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_rating_range CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_review_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_review_book FOREIGN KEY (bookId) REFERENCES books(book_id) ON DELETE CASCADE,

  -- one review per user per book (defined here to avoid duplicate key errors)
  UNIQUE KEY uq_review_user_book (userId, bookId),

  -- helpful indexes
  KEY ix_review_book (bookId, createdAt),
  KEY ix_review_user (userId, createdAt)
);

-- ======================
-- Staff Action Logs
-- ======================

CREATE TABLE IF NOT EXISTS staff_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staffId INT NOT NULL,
  action VARCHAR(255) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stafflog_user FOREIGN KEY (staffId) REFERENCES users(id)
);

-- ======================
-- Trigger: auto-compute isLate when returnAt is set or updated
-- No DELIMITER needed; single-statement trigger body
--   Policy:
--     - if dueAt is NOT NULL → Late when returnAt > dueAt
--     - if dueAt is NULL     → Late when (returnAt - checkoutAt) > 14 days
-- ======================

DROP TRIGGER IF EXISTS checkout_set_isLate;
CREATE TRIGGER checkout_set_isLate
BEFORE UPDATE ON checkout
FOR EACH ROW
SET NEW.isLate = CASE
  WHEN NEW.returnAt IS NULL THEN NEW.isLate
  WHEN NEW.dueAt   IS NOT NULL THEN (NEW.returnAt > NEW.dueAt)
  ELSE (TIMESTAMPDIFF(DAY, NEW.checkoutAt, NEW.returnAt) > 14)
END;

-- ======================
-- Optional one-time backfill (safe to re-run)
-- ======================
UPDATE checkout
SET isLate = CASE
  WHEN returnAt IS NULL THEN isLate
  WHEN dueAt   IS NOT NULL THEN (returnAt > dueAt)
  ELSE (TIMESTAMPDIFF(DAY, checkoutAt, returnAt) > 14)
END;

ALTER TABLE books
  ADD COLUMN retired TINYINT(1) NOT NULL DEFAULT 0 AFTER image_url,
  ADD COLUMN retired_at DATETIME NULL AFTER retired,
  ADD COLUMN retired_by INT NULL AFTER retired_at,
  ADD COLUMN retired_reason VARCHAR(255) NULL AFTER retired_by;

ALTER TABLE books
  ADD CONSTRAINT fk_books_retired_by
  FOREIGN KEY (retired_by) REFERENCES users(id);