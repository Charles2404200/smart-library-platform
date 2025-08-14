-- ============================================
-- Stored Procedures for Smart Library
-- Schema tables used:
--   books(book_id, title, genre, publisher_id, copies, available_copies)
--   checkout(id, userId, bookId, checkoutAt, returnAt, isLate)
--   review(id, userId, bookId, rating, comment, createdAt)
--   staff_log(id, staffId, action, createdAt)
-- ============================================

/* -------------------------------------------------
   BorrowBook: creates a checkout, decrements availability,
   and returns the fresh availability for the book.
   Concurrency-safe via SELECT ... FOR UPDATE.
-------------------------------------------------- */
DROP PROCEDURE IF EXISTS BorrowBook;
CREATE PROCEDURE BorrowBook(IN pUserId INT, IN pBookId INT)
BEGIN
  DECLARE vAvail INT;

  START TRANSACTION;

  -- lock the book row to prevent race conditions
  SELECT available_copies
    INTO vAvail
  FROM books
  WHERE book_id = pBookId
  FOR UPDATE;

  IF vAvail IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Book not found';
  END IF;

  IF vAvail <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No copies available';
  END IF;

  -- create checkout (checkoutAt has default NOW())
  INSERT INTO checkout (userId, bookId) VALUES (pUserId, pBookId);

  -- decrement availability
  UPDATE books
  SET available_copies = available_copies - 1
  WHERE book_id = pBookId;

  COMMIT;

  -- return updated availability
  SELECT pBookId AS book_id,
         (SELECT available_copies FROM books WHERE book_id = pBookId) AS available_copies;
END;

/* -------------------------------------------------
   ReturnBook: sets returnAt/isLate, increments availability
   (capped at total copies), and returns fresh availability.
   Concurrency-safe via SELECT ... FOR UPDATE.
-------------------------------------------------- */
DROP PROCEDURE IF EXISTS ReturnBook;
CREATE PROCEDURE ReturnBook(IN pCheckoutId INT)
BEGIN
  DECLARE vBookId INT;
  DECLARE vCheckoutAt DATETIME;
  DECLARE vReturnAt DATETIME;
  DECLARE vIsLate BOOLEAN;
  DECLARE vGraceDays INT DEFAULT 14;

  START TRANSACTION;

  -- lock the checkout row
  SELECT bookId, checkoutAt, returnAt
    INTO vBookId, vCheckoutAt, vReturnAt
  FROM checkout
  WHERE id = pCheckoutId
  FOR UPDATE;

  IF vBookId IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Checkout not found';
  END IF;

  IF vReturnAt IS NOT NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Already returned';
  END IF;

  -- simple lateness policy
  SET vIsLate = TIMESTAMPDIFF(DAY, vCheckoutAt, NOW()) > vGraceDays;

  UPDATE checkout
  SET returnAt = NOW(),
      isLate  = vIsLate
  WHERE id = pCheckoutId;

  -- bump availability but never over total copies
  UPDATE books
  SET available_copies = LEAST(copies, available_copies + 1)
  WHERE book_id = vBookId;

  COMMIT;

  -- return updated availability + lateness flag
  SELECT vBookId AS book_id,
         (SELECT available_copies FROM books WHERE book_id = vBookId) AS available_copies,
         vIsLate AS isLate;
END;

/* -------------------------------------------------
   AddBookReview: insert a user review.
-------------------------------------------------- */
DROP PROCEDURE IF EXISTS AddBookReview;
CREATE PROCEDURE AddBookReview(
  IN pUserId INT,
  IN pBookId INT,
  IN pRating INT,
  IN pComment TEXT
)
BEGIN
  INSERT INTO review (userId, bookId, rating, comment, createdAt)
  VALUES (pUserId, pBookId, pRating, pComment, NOW());
END;

/* -------------------------------------------------
   AddBook: insert a new book. Because your schema defines
   books.book_id as a plain INT (no AUTO_INCREMENT), we accept it.
   available_copies starts equal to copies.
-------------------------------------------------- */
DROP PROCEDURE IF EXISTS AddBook;
CREATE PROCEDURE AddBook(
  IN pBookId INT,
  IN pTitle VARCHAR(255),
  IN pGenre VARCHAR(100),
  IN pPublisherId INT,
  IN pCopies INT
)
BEGIN
  -- Prevent duplicate IDs
  IF EXISTS (SELECT 1 FROM books WHERE book_id = pBookId) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Book ID already exists';
  END IF;

  -- Insert with available_copies = copies at start
  INSERT INTO books (book_id, title, genre, publisher_id, copies, available_copies)
  VALUES (pBookId, pTitle, pGenre, pPublisherId, pCopies, pCopies);
END;


/* -------------------------------------------------
   UpdateBookInventory: admin sets total copies.
   Preserve the number currently borrowed and recompute availability:
     borrowed = old_copies - old_available
     new_available = GREATEST(0, pNewCopies - borrowed)
-------------------------------------------------- */
DROP PROCEDURE IF EXISTS UpdateBookInventory;
CREATE PROCEDURE UpdateBookInventory(
  IN pBookId INT,
  IN pNewCopies INT
)
BEGIN
  DECLARE vOldCopies INT;
  DECLARE vOldAvail INT;
  DECLARE vBorrowed  INT;
  DECLARE vNewAvail  INT;

  START TRANSACTION;

  SELECT copies, available_copies
    INTO vOldCopies, vOldAvail
  FROM books
  WHERE book_id = pBookId
  FOR UPDATE;

  IF vOldCopies IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Book not found';
  END IF;

  SET vBorrowed = GREATEST(0, vOldCopies - vOldAvail);
  SET vNewAvail = GREATEST(0, pNewCopies - vBorrowed);

  UPDATE books
  SET copies = pNewCopies,
      available_copies = vNewAvail
  WHERE book_id = pBookId;

  COMMIT;

  -- return updated stock numbers
  SELECT pBookId AS book_id,
         pNewCopies AS copies,
         vNewAvail AS available_copies;
END;

/* -------------------------------------------------
   RetireBook: remove a book record.
   (FKs on checkout/review may block delete if rows exist; handle in app policy.)
-------------------------------------------------- */
DROP PROCEDURE IF EXISTS RetireBook;
CREATE PROCEDURE RetireBook(IN pBookId INT)
BEGIN
  DELETE FROM books WHERE book_id = pBookId;
END;

/* -------------------------------------------------
   LogStaffAction: append to staff_log.
-------------------------------------------------- */
DROP PROCEDURE IF EXISTS LogStaffAction;
CREATE PROCEDURE LogStaffAction(IN pStaffId INT, IN pAction TEXT)
BEGIN
  INSERT INTO staff_log (staffId, action, createdAt)
  VALUES (pStaffId, pAction, NOW());
END;


DROP PROCEDURE IF EXISTS UpdateBookAvailable;
CREATE PROCEDURE UpdateBookAvailable(
  IN pBookId INT,
  IN pNewAvailable INT
)
BEGIN
  DECLARE vCopies INT;
  DECLARE vAvail INT;
  DECLARE vBorrowed INT;
  DECLARE vAdjAvail INT;

  START TRANSACTION;

  SELECT copies, available_copies
    INTO vCopies, vAvail
  FROM books
  WHERE book_id = pBookId
  FOR UPDATE;

  IF vCopies IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Book not found';
  END IF;

  -- how many are currently out
  SET vBorrowed = GREATEST(0, vCopies - vAvail);

  -- clamp requested available to >= 0
  SET vAdjAvail = GREATEST(0, pNewAvailable);

  -- keep borrowed constant; adjust total copies to borrowed + new available
  UPDATE books
  SET copies = vBorrowed + vAdjAvail,
      available_copies = vAdjAvail
  WHERE book_id = pBookId;

  COMMIT;

  SELECT pBookId AS book_id,
         (vBorrowed + vAdjAvail) AS copies,
         vAdjAvail AS available_copies;
END;
