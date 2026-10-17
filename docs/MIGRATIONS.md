# Updating your existing database

These steps change your **existing** `promptforge_db` without dropping or truncating anything.
None of them has been run for you. You run each one yourself, after a backup.

## Before you start

1. **Back up** (PowerShell, any folder):
   ```powershell
   mysqldump -u root -p promptforge_db > backup_before_migration.sql
   ```
   To undo everything later: `mysql -u root -p promptforge_db < backup_before_migration.sql`
   (in PowerShell: `Get-Content backup_before_migration.sql | mysql -u root -p promptforge_db`).
   If `mysql`/`mysqldump` are not on your PATH, they are in `C:\Program Files\MySQL\MySQL Server 8.0\bin\`.
2. **Register your own account** on the website (Create account) with `hrishikeshkhanna17@gmail.com` and your own
   password, if you have not already. Migration 004 and the library's admin-authored prompts need it to exist.
3. Install the server dependencies (`cd server`, then `npm install`).

## Run the migrations

From the `server` folder:

```powershell
npm run db:migrate                 # shows the list below and changes nothing
npm run db:migrate -- --all        # runs 001 to 006 in order
```
or one at a time, for example `npm run db:migrate -- 002_taxonomy.sql`.

| File | What it does | Changes existing rows? | Re-run safe? |
| :--- | :--- | :--- | :--- |
| `001_users_role_default.sql` | `users.role_id` default becomes 2 (USER) | Column default only | Yes |
| `002_taxonomy.sql` | Adds the 10 categories, 4 "suggested model" rows, 40 tags | Renames 3 categories (Academic & Research → Study & Exams, Software Engineering → Coding & Development, Marketing & Sales → Content Creation & Social Media), sets category descriptions, renames 3 tags (summarization → summary, unit-testing → testing, sql-generator → sql) | Yes |
| `003_demo_accounts.sql` | Adds 5 demo USER accounts (locked) | No | Yes |
| `004_promote_admin.sql` | Makes your registered account ADMIN | Your `role_id` only | Yes |
| `005_prompt_library.sql` | Adds 31 prompts with their versions and tags | No | Yes |
| `006_demo_activity.sql` | Adds seeded demo likes, bookmarks, ratings, comments, follows, notifications, activity-log rows | No | Yes |

Every file prints a PRE-CHECK and a VERIFY table, so you can see what happened.
If one stops with an error, the statements before it have been applied; fix the cause and run it again (they are idempotent).

Then:
```powershell
npm run demo:passwords      # one password for all 5 demo accounts (printed once)
```
and optionally set `DEMO_MODE=true` in `server\.env`.

## Check the result

```powershell
npm run test:sql            # the six use cases should all return rows
npm start                   # then open the website
```

## What is NOT changed

* Your own prompts, versions and interactions.
* The old seed accounts (System Administrator, Alex Rivera, Sarah Chen, David Kim, Maya Patel, Lucas Silva), their
  8 prompts, the categories "Creative Writing" and "System Prompts & Agents", unused old tags and old model rows.

Removing them is a separate decision. `database/migrations/099_legacy_cleanup_DRAFT.sql`:

1. Run it once as it is (`@confirm_legacy_cleanup = 0`):
   `npm run db:migrate -- 099_legacy_cleanup_DRAFT.sql --allow-cleanup`.
   It only prints what it would remove, including any prompts **you** created while logged in as an old seed account.
   Those are never deleted or reassigned automatically.
2. Review the output. Only if you approve, change the switch to `1` and run it again.

It never deletes an old prompt that someone else edited, an account that still owns prompts or wrote versions, or
`admin@promptforge.io` unless another admin exists.

## Fresh install instead

`npm run db:setup` creates the schema and runs 001-006 automatically, then tells you to register, promote and
re-run 005/006 so the admin's own library prompts are attached. It refuses to run on a database that has users.

## Changing the demo content

All demo content is in `database/library/library.js`. After editing it:
```powershell
cd server
npm run db:build-library     # regenerates 002-006 and sample_queries.sql
npm test                      # fails if the generated SQL is out of date
```
