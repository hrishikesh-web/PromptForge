const { query } = require('../config/db');

/**
 * Record user activity for traceability and DBMS auditability
 * Supports execution inside an existing transaction or via connection pool
 */
const logActivity = async ({ userId, action, tableName, recordId = null, metadata = null, tx = null }) => {
  try {
    const metaJson = metadata ? JSON.stringify(metadata) : null;
    const sql = `
      INSERT INTO activity_logs (user_id, action, table_name, record_id, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    const params = [userId || null, action, tableName, recordId, metaJson];

    if (tx) {
      await tx.query(sql, params);
    } else {
      await query(sql, params);
    }
  } catch (error) {
    console.error('Failed to log activity:', error.message);
    // Non-fatal, do not throw in non-transactional contexts
    if (tx) throw error;
  }
};

module.exports = { logActivity };
