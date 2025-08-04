-- =======================
-- Stored Procedures for Smart Library
-- =======================

--  Procedure: BorrowBook
DROP PROCEDURE IF EXISTS BorrowBook;
DELIMITER //
CREATE PROCEDURE BorrowBook(IN userId INT, IN bookId INT)
BEGIN
  DECLARE currentCopies INT;

  -- Check availability
  SELECT copies INTO currentCopies FROM Book WHERE id = bookId;

  IF currentCopies <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No copies available';
  END IF;

  -- Update inventory and insert checkout
  UPDATE Book SET copies = copies - 1 WHERE id = bookId;
  INSERT INTO Checkout (userId, bookId, checkoutAt) VALUES (userId, bookId, NOW());
END;
//
DELIMITER ;


-- 🔄 Procedure: ReturnBook
DROP PROCEDURE IF EXISTS ReturnBook;
DELIMITER //
CREATE PROCEDURE ReturnBook(IN checkoutId INT)
BEGIN
  DECLARE bId INT;
  DECLARE isLate BOOLEAN;

  SELECT bookId INTO bId FROM Checkout WHERE id = checkoutId;

  -- Check if overdue (after 14 days)
  SET isLate = (SELECT returnAt IS NULL AND NOW() > DATE_ADD(checkoutAt, INTERVAL 14 DAY) FROM Checkout WHERE id = checkoutId);

  UPDATE Checkout
  SET returnAt = NOW(), isLate = isLate
  WHERE id = checkoutId;

  UPDATE Book SET copies = copies + 1 WHERE id = bId;
END;
//
DELIMITER ;


-- ✍️ Procedure: AddBookReview
DROP PROCEDURE IF EXISTS AddBookReview;
DELIMITER //
CREATE PROCEDURE AddBookReview(
  IN userId INT,
  IN bookId INT,
  IN rating INT,
  IN comment TEXT
)
BEGIN
  INSERT INTO Review (userId, bookId, rating, comment, createdAt)
  VALUES (userId, bookId, rating, comment, NOW());
END;
//
DELIMITER ;


-- Procedure: AddBook
DROP PROCEDURE IF EXISTS AddBook;
DELIMITER //
CREATE PROCEDURE AddBook(
  IN title VARCHAR(255),
  IN genre VARCHAR(255),
  IN publisher VARCHAR(255),
  IN copies INT
)
BEGIN
  INSERT INTO Book (title, genre, publisher, copies)
  VALUES (title, genre, publisher, copies);
END;
//
DELIMITER ;


--  Procedure: UpdateBookInventory
DROP PROCEDURE IF EXISTS UpdateBookInventory;
DELIMITER //
CREATE PROCEDURE UpdateBookInventory(
  IN bookId INT,
  IN newCopies INT
)
BEGIN
  UPDATE Book SET copies = newCopies WHERE id = bookId;
END;
//
DELIMITER ;


--  Procedure: RetireBook
DROP PROCEDURE IF EXISTS RetireBook;
DELIMITER //
CREATE PROCEDURE RetireBook(IN bookId INT)
BEGIN
  DELETE FROM Book WHERE id = bookId;
END;
//
DELIMITER ;


--  Procedure: LogStaffAction
DROP PROCEDURE IF EXISTS LogStaffAction;
DELIMITER //
CREATE PROCEDURE LogStaffAction(
  IN staffId INT,
  IN action TEXT
)
BEGIN
  INSERT INTO StaffLog (staffId, action, createdAt)
  VALUES (staffId, action, NOW());
END;
//
DELIMITER ;
