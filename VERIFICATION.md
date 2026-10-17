# Verification report

Date: 17 Oct 2026. Environment: Linux cloud sandbox, Node 22.
**Limits of this environment:** no MySQL server could be installed or downloaded (package registries and Docker
registries are blocked), and Vite cannot run here (the shipped `node_modules` contain Windows-only native binaries).
So nothing below was executed against a real MySQL database, and `npm run build` was not run with Vite.

## Executed and passing

| Check | Command | Result |
| :--- | :--- | :--- |
| Library data rules + generated SQL up to date | `node ../database/library/build.js --check` | OK: 31 prompts, 40 tags |
| Original unit checks (bcrypt, JWT, validation, RBAC, SQL files, 58+ routes, role default 2, no hashes in seed, demo accounts locked) | `node test/test-runner.js` | 24/24 |
| Security and authorisation, through the real Express app with a stand-in DB layer | `node --test test/test-security.js` | 34/34 |
| Placeholder engine + version diff | `cd client && npm test` | 15/15 |
| Every server JS file parses | `node --check` | all pass |
| Frontend compiles with Vite's semantics (strict `.jsx`/`.js` loaders, all imports resolve) | esbuild 0.28 bundle of `src/main.jsx` | success |
| Tailwind CSS builds with the project config | project's own `tailwindcss` CLI | success |
| UI renders without runtime errors: home, explore, prompt detail (customiser filled), version history, create, sign-in (demo mode), admin users/taxonomy/reports, analytics, profile, dashboard, phone layouts | Chromium (Playwright) against the built bundle + a mock API serving the real library data | 0 page errors; screenshots reviewed |
| Server boots without a DB; protected routes 401; demo endpoint 404 by default; invalid input 400 | `node server.js` + curl | as expected |
| A token signed with the old published JWT secret is rejected | curl | 403 |
| All SQL (947 statements: migrations 001-006 and 099, seed, sample queries, the analytics queries): balanced quotes/parentheses, every INSERT/UPDATE table and column exists in `schema.sql`, every `alias.column` exists, no DROP/TRUNCATE | custom structural checker (verified to catch planted errors) | 0 problems |

What the security tests cover: guest and user visibility rules in SQL, 404 for private prompts, no likes/ratings/
comments on hidden or draft prompts, no self-rating, owner-only edit/delete (with rollback), version N+1 on edit,
5-tag limit, admin routes 401/403/200 by role, ADMIN-only category/model/tag management, registration always USER,
forged-token rejection, email hidden on public profiles, demo endpoint off by default, login throttling, no
self-role-change, last-admin protection, safe user deletion order and refusal, category-in-use refusal, tag merge
confirmation and transaction, report dismissal not un-hiding another report's decision.

## NOT verified here (do these on your laptop)

1. **Migrations on real MySQL 8** (`npm run db:migrate -- --all`). Checked structurally and by careful review, not executed.
   Each file prints PRE-CHECK and VERIFY tables; read them.
2. **The six use cases on real data** (`npm run test:sql`). The SQL uses standard MySQL 8 features (derived tables,
   UNION ALL, EXISTS, GROUP_CONCAT, WITH RECURSIVE), but was not executed here.
3. **Vite** dev server and `npm run build`.
4. **Real logins, sessions and data changes** through the website (`npm run test:live` after the migrations).
5. **Google Fonts** (IBM Plex) load online; offline, the app falls back to system fonts.
6. The cleanup draft `099_legacy_cleanup_DRAFT.sql` is intentionally not run. Review its report output first.
