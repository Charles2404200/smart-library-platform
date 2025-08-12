-- Stored Procedures — Smart Library (MySQL 8)
-- Tables: books(book_id, copies, available_copies), checkout(id,userId,bookId,checkoutAt,returnAt,isLate), review, staff_log

DROP PROCEDURE IF EXISTS BorrowBook;
CREATE PROCEDURE BorrowBook(IN pUserId INT, IN pBookId INT)
BEGIN
  DECLARE vAvail INT;

  START TRANSACTION;

  SELECT available_copies INTO vAvail
  FROM books
  WHERE book_id = pBookId
  FOR UPDATE;

  IF vAvail IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Book not found';
  END IF;

  IF vAvail <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No copies available';
  END IF;

  INSERT INTO checkout(userId, bookId) VALUES(pUserId, pBookId);

  UPDATE books
  SET available_copies = available_copies - 1
  WHERE book_id = pBookId;

  COMMIT;

  SELECT LAST_INSERT_ID() AS checkoutId, pBookId AS bookId;
END;

DROP PROCEDURE IF EXISTS ReturnBook;
CREATE PROCEDURE ReturnBook(IN pCheckoutId INT)
BEGIN
  DECLARE vBookId INT;
  DECLARE vCheckoutAt DATETIME;
  DECLARE vReturnAt DATETIME;
  DECLARE vIsLate BOOLEAN;
  DECLARE vGraceDays INT DEFAULT 14;

  START TRANSACTION;

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

  SET vIsLate = TIMESTAMPDIFF(DAY, vCheckoutAt, NOW()) > vGraceDays;

  UPDATE checkout
  SET returnAt = NOW(),
      isLate  = vIsLate
  WHERE id = pCheckoutId;

  UPDATE books
  SET available_copies = LEAST(copies, available_copies + 1)
  WHERE book_id = vBookId;

  COMMIT;

  SELECT pCheckoutId AS checkoutId, vBookId AS bookId, vIsLate AS isLate;
END;

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

DROP PROCEDURE IF EXISTS AddBook;
CREATE PROCEDURE AddBook(
  IN pTitle VARCHAR(255),
  IN pGenre VARCHAR(100),
  IN pPublisherId INT,
  IN pCopies INT
)
BEGIN
  INSERT INTO books (title, genre, publisher_id, copies, available_copies)
  VALUES (pTitle, pGenre, pPublisherId, pCopies, pCopies);
END;

DROP PROCEDURE IF EXISTS UpdateBookInventory;
CREATE PROCEDURE UpdateBookInventory(
  IN pBookId INT,
  IN pNewCopies INT
)
BEGIN
  START TRANSACTION;
  UPDATE books
  SET copies = pNewCopies,
      available_copies = LEAST(pNewCopies, GREATEST(0, available_copies))
  WHERE book_id = pBookId;
  COMMIT;
END;

DROP PROCEDURE IF EXISTS RetireBook;
CREATE PROCEDURE RetireBook(IN pBookId INT)
BEGIN
  DELETE FROM books WHERE book_id = pBookId;
END;

DROP PROCEDURE IF EXISTS LogStaffAction;
CREATE PROCEDURE LogStaffAction(IN pStaffId INT, IN pAction TEXT)
BEGIN
  INSERT INTO staff_log (staffId, action, createdAt)
  VALUES (pStaffId, pAction, NOW());
END;
