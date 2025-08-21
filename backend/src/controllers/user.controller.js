const {
  getUserById,
  updateUserName,
  updateUserAvatar,
  getUserPasswordHash, 
  updateUserPassword
} = require('../services/user.service');
const { comparePassword } = require('../services/auth.service');

// GET /api/users/me
async function getMyProfile(req, res) {
  const userId = req.user?.id;
  const conn = await req.db.getConnection();
  try {
    const user = await getUserById(conn, userId);
    res.json(user);
  } catch (err) {
    console.error('❌ Get profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
}

async function updateMyProfile(req, res) {
  const userId = req.user?.id;
  const { name } = req.body;
  const conn = await req.db.getConnection();
  try {
    await updateUserName(conn, userId, name.trim());
    const updatedUser = await getUserById(conn, userId);
    res.json(updatedUser);
  } catch (err) {
    console.error('❌ Update profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
}

async function uploadAvatar(req, res) {
  const userId = req.user?.id;
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  const conn = await req.db.getConnection();
  try {
    await updateUserAvatar(conn, userId, avatarUrl);
    res.json({ avatar_url: avatarUrl });
  } catch (err) {
    console.error('❌ Upload avatar error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
}

// POST /api/users/me/change-password
async function changePassword(req, res) {
    const userId = req.user?.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Old and new passwords are required.' });
    }

    const conn = await req.db.getConnection();
    try {
        const currentHash = await getUserPasswordHash(conn, userId);
        if (!currentHash) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const isMatch = await comparePassword(oldPassword, currentHash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect old password.' });
        }

        await updateUserPassword(conn, userId, newPassword);
        res.json({ message: 'Password updated successfully.' });

    } catch (err) {
        console.error('❌ Change password error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    } finally {
        conn.release();
    }
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  uploadAvatar,
  changePassword,
};