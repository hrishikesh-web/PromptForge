const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_DIR = path.join(__dirname, '..', '..', 'database');
const MIGRATIONS_DIR = path.join(DATABASE_DIR, 'migrations');

const sslOption = () =>
  String(process.env.DB_SSL || 'false').toLowerCase() === 'true' ? { ssl: { rejectUnauthorized: false } } : {};

/** Connection that can run multi-statement SQL files. `withDatabase=false` for CREATE DATABASE. */
const connect = (withDatabase = true) =>
  mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    ...(withDatabase ? { database: process.env.DB_NAME || 'promptforge_db' } : {}),
    multipleStatements: true,
    charset: 'utf8mb4',
    ...sslOption()
  });

/** Migration files in order (001_..., 002_...). DRAFT files are never included automatically. */
const listMigrations = () =>
  fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{3}_.+\.sql$/.test(f) && !/DRAFT/i.test(f))
    .sort();

/**
 * Run one SQL file and print the result of every SELECT (pre-checks and verifications)
 * as a small table, so you can read what happened.
 */
const runFile = async (conn, filePath, { quiet = false } = {}) => {
  const sql = fs.readFileSync(filePath, 'utf8');
  const [results] = await conn.query(sql);
  // With multipleStatements, mysql2 returns one entry per statement:
  // an array of rows for SELECT, or a header object ({ affectedRows }) for INSERT/UPDATE/etc.
  const items = Array.isArray(results) && results.some((r) => Array.isArray(r) || (r && 'affectedRows' in r)) ? results : [results];
  let changed = 0;
  for (const item of items) {
    if (Array.isArray(item)) {
      if (!quiet && item.length > 0) console.table(item.slice(0, 40));
    } else if (item && typeof item.affectedRows === 'number') {
      changed += item.affectedRows;
    }
  }
  return { changed };
};

module.exports = { DATABASE_DIR, MIGRATIONS_DIR, connect, listMigrations, runFile };
