#!/usr/bin/env node
/**
 * Sets ONE local password for every demo account (@demo.promptforge.test, role USER).
 * It never touches real accounts or ADMIN accounts.
 *
 *   npm run demo:passwords
 *
 * The password comes from DEMO_USER_PASSWORD in server/.env if set (min 10 characters);
 * otherwise a random one is generated and printed ONCE. Keep it to yourself; it is not
 * stored anywhere in plain text.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { connect } = require('../db/sqlRunner');
const { DEMO_EMAIL_DOMAIN } = require('../config/demo');

const generate = () => {
  const words = ['maple', 'river', 'quartz', 'lantern', 'orbit', 'cedar', 'harbor', 'violet', 'summit', 'ember'];
  const pick = () => words[crypto.randomInt(words.length)];
  return `${pick()}-${pick()}-${crypto.randomInt(100, 999)}`;
};

(async () => {
  const fromEnv = process.env.DEMO_USER_PASSWORD;
  if (fromEnv && fromEnv.length < 10) {
    console.error('DEMO_USER_PASSWORD in server/.env must be at least 10 characters.');
    process.exit(1);
  }
  const password = fromEnv || generate();
  const hash = await bcrypt.hash(password, 10);

  const conn = await connect(true);
  try {
    const [result] = await conn.query(
      `UPDATE users u INNER JOIN roles r ON r.role_id = u.role_id
       SET u.password_hash = ?, u.updated_at = NOW()
       WHERE u.email LIKE ? AND r.role_name = 'USER'`,
      [hash, `%@${DEMO_EMAIL_DOMAIN}`]
    );
    const [rows] = await conn.query(
      "SELECT u.name, u.email FROM users u INNER JOIN roles r ON r.role_id = u.role_id WHERE u.email LIKE ? AND r.role_name = 'USER' ORDER BY u.user_id",
      [`%@${DEMO_EMAIL_DOMAIN}`]
    );
    if (rows.length === 0) {
      console.log('No demo accounts found. Run the migrations first:  npm run db:migrate -- --all');
      return;
    }
    console.table(rows);
    console.log(`\nUpdated ${result.affectedRows} demo account(s).`);
    console.log(fromEnv ? 'Password: the DEMO_USER_PASSWORD value from server/.env' : `Demo password (shown once): ${password}`);
    console.log('Tip: set DEMO_MODE=true in server/.env to list these accounts on the sign-in page.');
  } finally {
    await conn.end();
  }
})().catch((err) => {
  console.error('Failed:', err.sqlMessage || err.message);
  process.exit(1);
});
