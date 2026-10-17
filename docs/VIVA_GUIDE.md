# Viva guide: how PromptForge works

Short explanations of the important features, where the code is, and which DBMS concept each demonstrates.
Open the named file during the viva if asked "show me".

## 1. The schema in one minute

16 tables in `database/schema.sql`, InnoDB, utf8mb4.

| Group | Tables | Relationship |
| :--- | :--- | :--- |
| People and roles | `roles`, `users` | users N:1 roles (`users.role_id`) |
| Lookup tables | `categories`, `ai_models`, `tags` | prompts N:1 category, N:1 model |
| Core | `prompts`, `prompt_versions` | prompt 1:N versions; UNIQUE(prompt_id, version_number) |
| Many-to-many | `prompt_tags` | composite primary key (prompt_id, tag_id) |
| Interactions | `likes`, `bookmarks`, `ratings`, `comments`, `follows` | UNIQUE(prompt_id, user_id) stops double likes; CHECK rating 1-5; UNIQUE(follower_id, following_id) |
| Platform | `notifications`, `reports`, `activity_logs` | audit and moderation |

**3NF**: every non-key column depends on the key, the whole key, and nothing but the key. Category and model names are
not repeated in `prompts` (only their ids). Tags are a separate table plus a junction table instead of a comma list
(which would break 1NF). The prompt text is in `prompt_versions`, not in `prompts`, because one prompt has many versions.

**Referential integrity and ON DELETE choices** (be ready to justify each):
* `prompts.user_id` → CASCADE: deleting a user deletes their prompts.
* `prompts.category_id`, `prompts.model_id` → RESTRICT: a category in use cannot be deleted. The admin page shows this
  as a clear message (`category.controller.js` → `deleteCategory`).
* `prompt_versions.created_by` → RESTRICT: version history is protected. `admin.controller.js` → `deleteUser` deletes
  the user's prompts first, inside a transaction, and refuses if the user wrote versions of other people's prompts.
* `activity_logs.user_id`, `notifications.sender_id`, `reports.reviewed_by` → SET NULL: the audit trail survives
  when a user is deleted.
* `users.role_id` default is 2 (USER). It used to be 1 (ADMIN); migration 001 fixes existing databases.

## 2. Transactions (atomicity)

`server/controllers/prompt.controller.js`
* `createPrompt`: INSERT prompt → INSERT version 1 → tags → activity log, then COMMIT. On any error, ROLLBACK, so
  there is never a prompt without a version.
* `updatePrompt`: `SELECT … FOR UPDATE` locks the prompt row, so two simultaneous edits cannot both create "version 3".
  The new text becomes version N+1; old versions are never overwritten.
* `rollbackPromptVersion`: "restore" copies old text into a NEW version (non-destructive).

Also: `report.controller.js` → `updateReportStatus` (close the report + hide the prompt together), `tag.controller.js` →
`updateTag` with merge (move links + delete the old tag together), `admin.controller.js` → `deleteUser`.

## 3. Privacy: who can see a draft?

One rule, one file: `server/utils/visibility.js`.
* Guest: `status = 'published' AND is_moderated = FALSE`
* Logged-in user: that, `OR p.user_id = <me>`
* Admin: everything

It is added to the WHERE clause of the prompt list, the prompt detail, bookmarks, comments, likes, ratings and reports.
A private prompt returns **404, not 403**, so its existence is not revealed. Analytics only count public prompts.
Tests: `server/test/test-security.js` (the "draft privacy" tests).

## 4. Roles and authorisation (RBAC)

* `middleware/auth.js` → `authenticateToken` verifies the JWT, then **re-reads the user and role from MySQL on every
  request**. A role change applies on the next request, and a deleted user's token stops working.
* `middleware/rbac.js` → `requireRole('ADMIN')` guards every admin route on the server (`routes/admin.routes.js`),
  not just by hiding buttons in React.
* Registration always inserts `role_id = 2`; a request body cannot ask for ADMIN (tested).
* Guards: an admin cannot change their own role, and the last admin cannot be demoted or deleted.
* Website roles are rows in `roles`. MySQL privileges (GRANT) belong to the MySQL account in `server/.env`. They are
  unrelated.

## 5. Reusable templates (placeholders)

`client/src/utils/placeholders.js` (pure functions, unit-tested in `client/tests/placeholders.test.js`).
* `extractPlaceholders` finds every `{{name}}` with a regular expression, de-duplicates and counts repeats.
* `fillTemplate` replaces each occurrence; empty values stay as `{{name}}` so the user can see what is missing.
* `client/src/components/PromptCustomizer.jsx` shows one input per unique placeholder, a live preview (filled = green,
  missing = amber), Copy and Reset. Values are kept only in the browser (localStorage). **The database template is
  never modified**, so version history stays accurate.

## 6. Tags without duplicates

`server/utils/tags.js` normalises every tag ("Open Book" → `open-book`, "#React" → `react`), removes duplicates and
allows at most 5 per prompt. `tags.tag_name` is UNIQUE, and `INSERT IGNORE` + `SELECT` reuses existing tags. Users get
suggestions while typing (`TagInput.jsx`). Admins can rename, merge (moves `prompt_tags` rows in a transaction) and
delete tags.

## 7. The six use cases

All in `server/sql/useCases.js`; the Analytics page shows each query's SQL with "Show SQL".

1. **Top 10 by engagement.** Why derived tables? Joining likes × bookmarks × comments × ratings directly multiplies
   rows (a prompt with 4 likes and 3 ratings gives 12 rows), which corrupts COUNT and AVG. Aggregating each table
   first gives one row per prompt per table.
2. **Most active creators.** Prompt creations and later versions are combined with UNION ALL, then counted per user
   with `COUNT(CASE WHEN …)`. A `?month=YYYY-MM` filter selects a calendar month; otherwise the last 30 days.
3. **Model + category + tag filter.** Joins across 1:N and M:N relationships. The tag condition is an EXISTS
   subquery so GROUP_CONCAT can still list all of a prompt's tags.
4. **Users with most bookmarks.** COUNT + GROUP BY + ORDER BY + LIMIT.
5. **Average rating by category.** LEFT JOIN keeps categories with no ratings. The public-prompt condition is in the ON
   clause; putting it in WHERE would turn the LEFT JOIN into an INNER JOIN and hide empty categories.
6. **Monthly trend.** `WITH RECURSIVE` generates the last 6 months so empty months show 0 instead of disappearing.

## 8. Indexes

`database/indexes.sql` adds secondary and composite indexes for the common lookups (prompts by user/category/status,
interactions by prompt). UNIQUE constraints also create indexes. Use `EXPLAIN SELECT …` on a use case to show which
index MySQL uses.

## 9. Audit trail

`server/utils/activityLogger.js` writes to `activity_logs` (who, action, table, record, JSON metadata). Inside a
transaction it uses the same connection, so the log commits or rolls back with the change. Admin → Activity log.

## 10. Safe data changes

`database/migrations/` holds idempotent migrations (they can be re-run) that never DROP or TRUNCATE. They find rows by
name or email instead of numeric id, so the same file works on any copy of the database. The runner
(`server/db/migrate.js`) refuses files containing DROP or TRUNCATE.

## Likely questions

* *Why is the prompt text not in the prompts table?* Versioning: one prompt has many texts over time (1:N).
* *What stops a user liking twice?* UNIQUE(prompt_id, user_id) on `likes`, plus `INSERT IGNORE`.
* *What happens to comments if a prompt is deleted?* ON DELETE CASCADE removes them.
* *Why parameterised queries?* `?` placeholders are escaped by mysql2, which prevents SQL injection.
* *How are passwords stored?* bcrypt hashes (salted, cost 10); the plain password is never stored.
* *Can a normal user open the admin API directly?* No: requireRole('ADMIN') returns 403 (tested).
