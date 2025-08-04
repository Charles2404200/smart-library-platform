-- ==========================
-- 📈 Index Optimization
-- ==========================

-- Index for fast login/auth lookup
CREATE INDEX idx_user_email ON User(email);

-- Index for frequent book searches
CREATE INDEX idx_book_title ON Book(title);
CREATE INDEX idx_book_genre ON Book(genre);

-- Index to speed up review queries per book
CREATE INDEX idx_review_bookId ON Review(bookId);

-- Index for borrow history per user
CREATE INDEX idx_checkout_userId ON Checkout(userId);
CREATE INDEX idx_checkout_bookId ON Checkout(bookId);

-- Composite index for date range queries (e.g., reports)
CREATE INDEX idx_checkout_date ON Checkout(checkoutAt, returnAt);

-- Index to speed up logs filtering by staff
CREATE INDEX idx_stafflog_staffId ON StaffLog(staffId);

-- ==========================
-- 💡 Query Optimization Tips
-- ==========================

-- Prefer covering indexes for SELECTs
-- Avoid SELECT * when only a few columns are needed
-- Use LIMIT for paginated data (e.g., book search)
-- Avoid using functions on indexed columns in WHERE clause (make queries sargable)
