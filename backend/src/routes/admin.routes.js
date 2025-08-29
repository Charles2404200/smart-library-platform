// src/routes/admin.routes.js
const express = require('express');
const router = express.Router();

const { authenticateJWT, verifyStaffOrAdmin } = require('../../middlewares/authMiddleware');
const { upload } = require('../utils/upload');
const Admin = require('../controllers/admin.controller');

// All routes below require: logged-in + staff/admin
router.use(authenticateJWT, verifyStaffOrAdmin);

// ----- Books -----
router.get('/books', Admin.listBooks);
router.post('/books', Admin.createBook);
router.put('/books/:id', Admin.updateBookMeta);
router.patch('/books/:id/copies', Admin.adjustCopies);
router.patch('/books/:id/available', Admin.adjustAvailable);
router.post('/books/:id/image', upload.single('image'), Admin.uploadImage);
router.delete('/books/:id', Admin.deleteBook);


// Retire / Unretire (controller enforces admin-only)
router.post('/books/:id/retire', Admin.retireBook);
router.post('/books/:id/unretire', Admin.unretireBook);

// ----- Lookups -----
router.get('/publishers', Admin.listPublishers);
router.get('/authors', Admin.listAuthors);

// ----- Logs -----
router.get('/logs', Admin.listLogs);

// ----- Users -----
router.get('/users', Admin.listUsers);
router.patch('/users/:id/role', Admin.changeUserRole);
router.get('/reports/most-borrowed', Admin.mostBorrowedReport);
router.get('/reports/top-readers', Admin.topReadersReport);
router.get('/reports/low-availability', Admin.lowAvailabilityReport);


module.exports = router;
