#!/usr/bin/env node
/**
 * FRESH database setup:  npm run db:setup
 *
 *  1. schema.sql   - creates promptforge_db and the 16 tables (DROPS existing tables!)
 *  2. indexes.sql  - secondary / composite indexes
 *  3. seed.sql     - the two roles
 *  4. migrations   - 001-006: taxonomy, demo accounts, prompt library, demo activity
 *
 * SAFETY: because schema.sql drops tables, this refuses to run when the database
 * already contains users. Use `npm run db:reset` ONLY to deliberately wipe everything
 * (take a mysqldump backup first). To update an existing database, use
 * `npm run db:migrate` instead - it never drops anything.
 */
const path = require('path');
const { DATABASE_DIR, MIGRATIONS_DIR, connect, listMigrations, runFile } = require('./sqlRunner');

async function runSetup() {
  const dbName = process.env.DB_NAME || 'promptforge_db';
  const force = process.argv.includes('--force');
  console.log('--- PROMPTFORGE DATABASE SETUP ---');
  console.log(`Target: ${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 3306}, database "${dbName}"`);

  let conn;
  try {
    conn = await connect(false);
    console.log('Connected to MySQL.');

    const [existing] = await conn.query(
      "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ? AND table_name = 'users'",
      [dbName]
    );
    if (existing[0].n > 0) {
      const [cnt] = await conn.query(`SELECT COUNT(*) AS n FROM \`${dbName}\`.users`);
      if (cnt[0].n > 0 && !force) {
        console.error(`\n⚠ Database "${dbName}" already contains ${cnt[0].n} user(s). Setup would DROP every table.`);
        console.error('  To update your existing database safely, run:   npm run db:migrate -- --all');
        console.error('  To wipe it and start again (after a backup):     npm run db:reset');
        process.exitCode = 1;
        return;
      }
      if (force) console.warn(`⚠ --force: dropping and recreating all tables in "${dbName}".`);
    }

    for (const file of ['schema.sql', 'indexes.sql', 'seed.sql']) {
      process.stdout.write(`Running ${file}… `);
      try {
        await runFile(conn, path.join(DATABASE_DIR, file), { quiet: true });
        console.log('done');
      } catch (err) {
        if (file === 'indexes.sql') console.warn(`skipped (${err.sqlMessage || err.message})`);
        else throw err;
      }
    }

    for (const file of listMigrations()) {
      process.stdout.write(`Running migrations/${file}… `);
      await runFile(conn, path.join(MIGRATIONS_DIR, file), { quiet: true });
      console.log('done');
    }

    console.log('\n✅ Database ready.');
    console.log('Next steps:');
    console.log('  1. npm start, open the website and register your own account');
    console.log('  2. npm run admin:promote -- you@example.com --yes      (make it ADMIN)');
    console.log('  3. npm run db:migrate -- 005_prompt_library.sql 006_demo_activity.sql');
    console.log('     (adds the library prompts that belong to the admin account, now that it exists)');
    console.log('  4. npm run demo:passwords                               (password for the demo accounts)');
  } catch (error) {
    console.error('\n❌ Database setup failed:', error.sqlMessage || error.message);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

if (require.main === module) runSetup();
module.exports = runSetup;
