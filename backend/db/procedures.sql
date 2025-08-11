-- =======================
-- Stored Procedures for Smart Library (Corrected)
-- =======================

-- Procedure: BorrowBook
DROP PROCEDURE IF EXISTS BorrowBook;
CREATE PROCEDURE BorrowBook(IN p_user_id INT, IN p_book_id INT)
BEGIN
  DECLARE currentCopies INT;
  SELECT available_copies INTO currentCopies FROM books WHERE book_id = p_book_id;
  IF currentCopies <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No copies available';
  END IF;
  UPDATE books SET available_copies = available_copies - 1 WHERE book_id = p_book_id;
  INSERT INTO checkout (user_id, book_id, checkout_at) VALUES (p_user_id, p_book_id, NOW());
END;

-- 🔄 Procedure: ReturnBook
DROP PROCEDURE IF EXISTS ReturnBook;
CREATE PROCEDURE ReturnBook(IN p_checkout_id INT)
BEGIN
  DECLARE bId INT;
  DECLARE isLate BOOLEAN;
  SELECT book_id INTO bId FROM checkout WHERE id = p_checkout_id;
  SET isLate = (SELECT return_at IS NULL AND NOW() > DATE_ADD(checkout_at, INTERVAL 14 DAY) FROM checkout WHERE id = p_checkout_id);
  UPDATE checkout SET return_at = NOW(), is_late = isLate WHERE id = p_checkout_id;
  UPDATE books SET available_copies = available_copies + 1 WHERE book_id = bId;
END;

-- ✍️ Procedure: AddBookReview
DROP PROCEDURE IF EXISTS AddBookReview;
CREATE PROCEDURE AddBookReview(IN p_user_id INT, IN p_book_id INT, IN p_rating INT, IN p_comment TEXT)
BEGIN
  INSERT INTO review (userId, bookId, rating, comment, createdAt)
  VALUES (p_user_id, p_book_id, p_rating, p_comment, NOW());
END;

-- Procedure: AddBook
DROP PROCEDURE IF EXISTS AddBook;
CREATE PROCEDURE AddBook(IN p_title VARCHAR(255), IN p_genre VARCHAR(100), IN p_publisher_id INT, IN p_copies INT)
BEGIN
  INSERT INTO books (title, genre, publisher_id, copies, available_copies)
  VALUES (p_title, p_genre, p_publisher_id, p_copies, p_copies);
END;

-- Procedure: UpdateBookInventory
DROP PROCEDURE IF EXISTS UpdateBookInventory;
CREATE PROCEDURE UpdateBookInventory(IN p_book_id INT, IN p_new_copies INT)
BEGIN
  UPDATE books SET copies = p_new_copies, available_copies = p_new_copies WHERE book_id = p_book_id;
END;

-- Procedure: RetireBook
DROP PROCEDURE IF EXISTS RetireBook;
CREATE PROCEDURE RetireBook(IN p_book_id INT)
BEGIN
  DELETE FROM books WHERE book_id = p_book_id;
END;

-- Procedure: LogStaffAction
DROP PROCEDURE IF EXISTS LogStaffAction;
CREATE PROCEDURE LogStaffAction(IN p_staff_id INT, IN p_action VARCHAR(255))
BEGIN
  INSERT INTO staff_log (staffId, action, createdAt)
  VALUES (p_staff_id, p_action, NOW());
END;
