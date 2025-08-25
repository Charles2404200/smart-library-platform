const jwt = require('jsonwebtoken');
const SECRET = process.env.READER_JWT_SECRET || 'dev-reader-secret';

function signReaderToken({ userId, bookId, sessionId }) {
  return jwt.sign({ uid: Number(userId), bid: Number(bookId), sid: String(sessionId) }, SECRET, { expiresIn: '30m' });
}
function verifyReaderToken(token) {
  try { return jwt.verify(token, SECRET); } catch { return null; }
}
module.exports = { signReaderToken, verifyReaderToken };
