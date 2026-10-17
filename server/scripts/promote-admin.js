#!/usr/bin/env node
/**
 * Promote an EXISTING, registered account to the website ADMIN role.
 *
 *   npm run admin:promote -- someone@example.com            (shows the account, changes nothing)
 *   npm run admin:promote -- someone@example.com --yes      (applies the change)
 *
 * This changes users.role_id only. It does not create accounts, set passwords,
 * or touch MySQL users/privileges (website roles and MySQL privileges are separate).
 */
const { connect } = require('../db/sqlRunner');

(async () => {
  const email = (process.argv[2] || '').toLowerCase().trim();
  const apply = process.argv.includes('--yes');
  if (!email || email.startsWith('--')) {
    console.log('Usage: npm run admin:promote -- you@example.com [--yes]');
    process.exit(1);
  }

  const conn = await connect(true);
  try {
    const [rows] = await conn.query(
      'SELECT u.user_id, u.name, u.email, r.role_name FROM users u INNER JOIN roles r ON r.role_id = u.role_id WHERE u.email = ?',
      [email]
    );
    if (rows.length === 0) {
      console.log(`No account with email ${email}. Register it on the website first (Create account), then run this again.`);
      process.exit(1);
    }
    console.table(rows);
    if (rows[0].role_name === 'ADMIN') {
      console.log('Already ADMIN. Nothing to do.');
      return;
    }
    if (!apply) {
      console.log('Dry run. Add --yes to make this account ADMIN.');
      return;
    }
    await conn.beginTransaction();
    await conn.query("UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role_name = 'ADMIN'), updated_at = NOW() WHERE user_id = ?", [
      rows[0].user_id
    ]);
    await conn.query(
      "INSERT INTO activity_logs (user_id, action, table_name, record_id, metadata, created_at) VALUES (?, 'UPDATE_USER_ROLE', 'users', ?, JSON_OBJECT('to', 'ADMIN', 'via', 'admin:promote script'), NOW())",
      [rows[0].user_id, rows[0].user_id]
    );
    await conn.commit();
    console.log(`${rows[0].name} is now ADMIN. Sign out and back in (or refresh) to see the Admin page.`);
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    await conn.end();
  }
})().catch((err) => {
  console.error('Failed:', err.sqlMessage || err.message);
  process.exit(1);
});
