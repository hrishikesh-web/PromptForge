const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Always load server/.env, regardless of the directory the server is started from
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// SSL is opt-in: most local MySQL/XAMPP installs reject or don't need it
const sslEnabled = String(process.env.DB_SSL || 'false').toLowerCase() === 'true';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'promptforge_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  multipleStatements: true,
  ...(sslEnabled ? { ssl: { rejectUnauthorized: false } } : {})
});

/**
 * Execute parameterized raw SQL query
 * @param {string} sql
 * @param {Array} params
 */
const query = async (sql, params = []) => {
  const [rows, fields] = await pool.query(sql, params);
  return rows;
};

/**
 * Transaction helper for atomic operations
 * Usage:
 * const tx = await getTransaction();
 * try {
 *    await tx.query('INSERT ...', [..]);
 *    await tx.commit();
 * } catch (err) {
 *    await tx.rollback();
 *    throw err;
 * } finally {
 *    tx.release();
 * }
 */
const getTransaction = async () => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  return {
    connection,
    query: (sql, params = []) => connection.query(sql, params).then(([rows]) => rows),
    commit: () => connection.commit(),
    rollback: () => connection.rollback(),
    release: () => connection.release()
  };
};

/**
 * Check connectivity for health monitoring
 */
const checkConnection = async () => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    return { connected: true };
  } catch (error) {
    return { connected: false, error: error.message };
  }
};

module.exports = {
  pool,
  query,
  getTransaction,
  checkConnection
};
