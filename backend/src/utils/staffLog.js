// src/utils/staffLog.js
/**
 * Ghi log bằng stored procedure LogStaffAction; nếu lỗi → fallback insert trực tiếp.
 */
async function writeStaffLog(dbOrConn, staffId, action) {
  let msg = action || '';
  if (msg.length > 255) msg = msg.slice(0, 252) + '...';

  try {
    await dbOrConn.query('CALL LogStaffAction(?, ?)', [staffId || null, msg]);
  } catch (logErr) {
    try {
      await dbOrConn.query(
        'INSERT INTO staff_log (staffId, action, createdAt) VALUES (?, ?, NOW())',
        [staffId || null, msg]
      );
    } catch (fallbackErr) {
      console.error('❌ Failed to write staff log:', fallbackErr.message);
    }
  }
}

module.exports = { writeStaffLog };
