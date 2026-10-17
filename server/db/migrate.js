#!/usr/bin/env node
/**
 * Run PromptForge SQL migrations against the database in server/.env.
 * You run this yourself; nothing runs automatically.
 *
 *   npm run db:migrate                      list migrations and what each does
 *   npm run db:migrate -- 002_taxonomy.sql  run one (or several) by file name
 *   npm run db:migrate -- --all             run 001 to 006 in order
 *
 * Safety:
 *  - Files containing DROP or TRUNCATE are refused.
 *  - DRAFT files (099_legacy_cleanup_DRAFT.sql) are refused unless you add --allow-cleanup,
 *    and that file additionally has its own @confirm switch inside.
 *  - Every migration 001-006 is safe to re-run.
 */
const fs = require('fs');
const path = require('path');
const { MIGRATIONS_DIR, connect, listMigrations, runFile } = require('./sqlRunner');

const DESCRIPTIONS = {
  '001_users_role_default.sql': 'New users default to USER (role 2), never ADMIN.',
  '002_taxonomy.sql': 'Library categories, suggested-model rows and tags (adds; 3 category + 3 tag renames).',
  '003_demo_accounts.sql': 'Five demo accounts on @demo.promptforge.test (locked until demo:passwords).',
  '004_promote_admin.sql': "Makes Hrishikesh's registered account ADMIN (no-op if not registered yet).",
  '005_prompt_library.sql': '31 prompt templates with versions and tags.',
  '006_demo_activity.sql': 'Seeded demo likes, bookmarks, ratings, comments, follows, notifications, logs.'
};

/** Remove comments, then string literals, so words inside prompt text never trigger the safety check. */
const stripComments = (sql) => sql.replace(/--.*$/gm, '').replace(/'(?:[^']|'')*'/g, "''");

const main = async () => {
  const args = process.argv.slice(2);
  const allowCleanup = args.includes('--allow-cleanup');
  const all = args.includes('--all');
  const quiet = args.includes('--quiet');
  const names = args.filter((a) => !a.startsWith('--'));
  const available = listMigrations();

  if (!all && names.length === 0) {
    console.log('PromptForge migrations (database/migrations):\n');
    available.forEach((f) => console.log(`  ${f.padEnd(28)} ${DESCRIPTIONS[f] || ''}`));
    console.log('  099_legacy_cleanup_DRAFT.sql DRAFT: removes old seed accounts. Needs your approval first.\n');
    console.log('Back up first:  mysqldump -u root -p promptforge_db > backup_before_migration.sql');
    console.log('Run all:        npm run db:migrate -- --all');
    console.log('Run one:        npm run db:migrate -- 002_taxonomy.sql');
    return;
  }

  const files = all ? available : names;
  for (const f of files) {
    const full = path.join(MIGRATIONS_DIR, path.basename(f));
    if (!fs.existsSync(full)) throw new Error(`Migration not found: ${f}`);
    const sql = stripComments(fs.readFileSync(full, 'utf8'));
    if (/\b(DROP|TRUNCATE)\b/i.test(sql)) throw new Error(`${f} contains DROP or TRUNCATE; refusing to run it.`);
    if (/DRAFT/i.test(f) && !allowCleanup) {
      throw new Error(`${f} is a DRAFT cleanup script. Review it, take a backup, then add --allow-cleanup.`);
    }
  }

  const conn = await connect(true);
  try {
    const [[{ db }]] = await conn.query('SELECT DATABASE() AS db');
    console.log(`Connected to ${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 3306}, database "${db}".`);
    for (const f of files) {
      console.log(`\n=== ${f}  ${DESCRIPTIONS[path.basename(f)] || ''}`);
      const { changed } = await runFile(conn, path.join(MIGRATIONS_DIR, path.basename(f)), { quiet });
      console.log(`✔ ${f} finished (${changed} row change${changed === 1 ? '' : 's'} reported by MySQL).`);
    }
    console.log('\nAll requested migrations finished.');
  } finally {
    await conn.end();
  }
};

main().catch((err) => {
  console.error(`\n✖ Migration stopped: ${err.message}`);
  if (err.sqlMessage) console.error(`  MySQL said: ${err.sqlMessage}`);
  console.error('  Statements before the failing one have already been applied; they are safe to re-run after fixing the problem.');
  process.exit(1);
});
