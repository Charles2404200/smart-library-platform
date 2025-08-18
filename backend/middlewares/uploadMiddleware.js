const multer = require('multer');
const path = require('path');
const fs = require('fs');

const avatarUploadPath = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(avatarUploadPath)) {
  fs.mkdirSync(avatarUploadPath, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarUploadPath);
  },
  filename: function (req, file, cb) {
    const userId = req.user?.id || 'unknown';
    const ext = path.extname(file.originalname);
    cb(null, `user-${userId}-${Date.now()}${ext}`);
  },
});

const uploadAvatarMiddleware = multer({ storage: avatarStorage });

module.exports = { uploadAvatarMiddleware };