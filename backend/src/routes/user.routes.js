const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../../middlewares/authMiddleware');
const UserController = require('../controllers/user.controller');
const { uploadAvatarMiddleware } = require('../../middlewares/uploadMiddleware'); 

router.use(authenticateJWT);

router.get('/me', UserController.getMyProfile);
router.patch('/me', UserController.updateMyProfile);

router.post('/me/avatar', uploadAvatarMiddleware.single('avatar'), UserController.uploadAvatar);

router.post('/me/change-password', UserController.changePassword);

module.exports = router;