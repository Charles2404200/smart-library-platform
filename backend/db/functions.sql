-- ============================
--  Stored Functions for Smart Library
-- ============================

-- Check if a book is available
DROP FUNCTION IF EXISTS IsBookAvailable;
DELIMITER //
CREATE FUNCTION IsBookAvailable(bookId INT)
RETURNS BOOLEAN
DETERMINISTIC
BEGIN
  DECLARE availableCopies INT;
  SELECT copies INTO availableCopies FROM Book WHERE id = bookId;
  RETURN availableCopies > 0;
END;
//
DELIMITER ;


-- Check if book is returned on time
DROP FUNCTION IF EXISTS IsReturnedOnTime;
DELIMITER //
CREATE FUNCTION IsReturnedOnTime(checkoutId INT)
RETURNS BOOLEAN
DETERMINISTIC
BEGIN
  DECLARE dueDate DATE;
  DECLARE returnDate DATE;

  SELECT checkoutAt + INTERVAL 14 DAY INTO dueDate FROM Checkout WHERE id = checkoutId;
  SELECT returnAt INTO returnDate FROM Checkout WHERE id = checkoutId;

  RETURN returnDate <= dueDate;
END;
//
DELIMITER ;


-- Count number of borrowed books in a time range
DROP FUNCTION IF EXISTS GetBorrowedCountInRange;
DELIMITER //
CREATE FUNCTION GetBorrowedCountInRange(startDate DATE, endDate DATE)
RETURNS INT
DETERMINISTIC
BEGIN
  DECLARE borrowCount INT;
  SELECT COUNT(*) INTO borrowCount FROM Checkout
  WHERE checkoutAt BETWEEN startDate AND endDate;
  RETURN borrowCount;
END;
//
DELIMITER ;


-- Calculate average rating of a book
DROP FUNCTION IF EXISTS GetAverageRating;
DELIMITER //
CREATE FUNCTION GetAverageRating(bookId INT)
RETURNS FLOAT
DETERMINISTIC
BEGIN
  DECLARE avgRating FLOAT;
  SELECT AVG(rating) INTO avgRating FROM Review WHERE bookId = bookId;
  RETURN IFNULL(avgRating, 0);
END;
//
DELIMITER ;


-- Count number of books a user has currently borrowed
DROP FUNCTION IF EXISTS GetUserActiveBorrowCount;
DELIMITER //
CREATE FUNCTION GetUserActiveBorrowCount(userId INT)
RETURNS INT
DETERMINISTIC
BEGIN
  DECLARE countBorrowed INT;
  SELECT COUNT(*) INTO countBorrowed FROM Checkout
  WHERE userId = userId AND returnAt IS NULL;
  RETURN countBorrowed;
END;
//
DELIMITER ;
