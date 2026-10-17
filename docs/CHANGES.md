# What changed in this version

## Security and privacy fixes
| Problem | Fix | Where |
| :--- | :--- | :--- |
| Anyone could list other users' drafts with `?status=draft` / `?status=all` | One visibility rule applied everywhere | `server/utils/visibility.js`, `prompt.controller.js` |
| Any draft or hidden prompt could be opened, liked, rated, commented on or reported by id | Same rule on every prompt endpoint; private prompts return 404 | `interaction.controller.js`, `report.controller.js` |
| New users defaulted to ADMIN in the schema (`role_id DEFAULT 1`) | Default 2 (USER) in `schema.sql` + migration 001 | `database/schema.sql`, `migrations/001_…` |
| JWT secret fell back to a value published in the repo (forgeable admin tokens) | No fallback; published values refused; random per-process secret in development | `server/config/jwt.js` |
| One-click admin login with a public password on the sign-in page | Removed. Optional demo mode lists demo USER accounts only, never passwords | `LandingLogin.jsx`, `auth.controller.js` |
| Public profiles exposed every user's email | Email only for that user or an admin | `routes/user.routes.js` |
| Public analytics returned emails and counted private drafts | Emails removed, public prompts only | `server/sql/useCases.js` |
| No brute-force protection on login | 8 failures per email+IP → 15-minute block | `utils/loginThrottle.js` |
| Weak validation (status values, lengths, unlimited page size, tags) | Central validators, 5-tag limit, tag normalisation | `utils/validators.js`, `utils/tags.js` |
| Deleting a user crashed on the version foreign key | Transactional delete with impact preview and clear refusal | `admin.controller.js` |
| Dismissing one report un-hid a prompt another report had hidden | Only un-hide if no other approved report | `report.controller.js` |
| `getTransaction()` outside try: a DB error left requests hanging | All transactions inside try/finally | controllers |
| After a page reload, `user.userId` was undefined (owner checks failed) | Normalised user object | `client/src/context/AuthContext.jsx` |

## SQL correctness
* Use case 1 averaged ratings over a multiplied join (fan-out); now aggregates each table first.
* Use case 2 ignored edits to older prompts; now counts creations and versions with UNION ALL.
* Use case 3 showed only the matched tag; now uses EXISTS and lists all tags.
* Use case 6 skipped empty months; now uses a recursive CTE.
* One source of truth for the six queries (`server/sql/useCases.js`) used by the site, `test:sql` and `sample_queries.sql`.
* The old hard-coded use case 3 filter ('Software Engineering' / 'Claude 3.5 Sonnet' / 'code-refactor') is gone.

## New features
* Fill-in-the-blanks customiser with live preview, copy, reset, repeated placeholders.
* Version history with a line-by-line "changes" view.
* Admin: reports, prompt moderation (hide/restore/delete), users and roles, categories, suggested models, tags
  (rename/merge/delete), activity log with filters.
* Tag suggestions while typing; search also matches tag and creator names.
* Profile editing (name, bio). Toast messages instead of browser alert() pop-ups.
* Redesigned home, explore, prompt, create/edit, profile, dashboard, analytics and admin pages; mobile navigation;
  keyboard focus and reduced-motion support.

## Data
* 31-prompt library across 10 categories, 40 tags, 4 model-agnostic "suggested model" rows, 5 demo accounts and seeded
  demo activity, as reviewable, re-runnable migrations generated from `database/library/library.js`.
* `seed.sql` now only creates roles; `db:setup` runs the same migrations, so fresh and migrated databases match.
* Draft cleanup script for the old seed content (`099_legacy_cleanup_DRAFT.sql`), off by default.

## Removed files
`client/src/components/DataTable.jsx`, `FilterPanel.jsx`, `SearchBar.jsx`, `StatCard.jsx` (replaced by the new pages).
