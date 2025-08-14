-- =======================
-- Triggers
-- =======================

DROP TRIGGER IF EXISTS trg_borrow_book;
DELIMITER //
CREATE TRIGGER trg_borrow_book
AFTER INSERT ON Checkout
FOR EACH ROW
BEGIN
  UPDATE Book
  SET copies = copies - 1
  WHERE id = NEW.bookId;
END;
//
DELIMITER ;

DROP TRIGGER IF EXISTS trg_return_book;
DELIMITER //
CREATE TRIGGER trg_return_book
AFTER UPDATE ON Checkout
FOR EACH ROW
BEGIN
  IF NEW.returnAt IS NOT NULL AND OLD.returnAt IS NULL THEN
    UPDATE Book
    SET copies = copies + 1
    WHERE id = NEW.bookId;
  END IF;
END;
//
DELIMITER ;

DROP TRIGGER IF EXISTS trg_update_book_rating;
DELIMITER //
CREATE TRIGGER trg_update_book_rating
AFTER INSERT ON Review
FOR EACH ROW
BEGIN
  DECLARE avgRating FLOAT;
  SELECT AVG(rating) INTO avgRating
  FROM Review
  WHERE bookId = NEW.bookId;

  -- Lưu `avgRating` này vào một cột riêng nếu muốn
END;
//
DELIMITER ;
