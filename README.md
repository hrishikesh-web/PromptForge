# PromptForge

**Save it. Customise it. Reuse it.**

PromptForge is a library of reusable AI prompt templates for students and everyday AI users. People find a well-written
template for a task they repeat (open-book exam notes, debugging a Node.js API, a consistent photo look, a viva
rehearsal), fill in its `{{placeholders}}`, and copy the finished prompt into whatever AI tool they use. Every edit is
kept as a new version.

It is a second-year CSE **DBMS course project**: a React frontend over an Express API and a normalised **MySQL 8**
database (16 tables, 3NF, foreign keys, transactions, indexes, six analytical SQL use cases).

PromptForge is not a chatbot. It stores and organises prompts; it does not call any paid AI API.

---

## 1. What you can do

| Area | Features |
| :--- | :--- |
| Discover | Search by title, description, tag or creator; filter by category, tag and suggested model; sort by newest, most saved, highest rated, recently updated |
| Reuse | **Fill in the blanks**: placeholders are detected automatically, filled once even if repeated, previewed live, copied with one click; inputs can be reset; the stored template is never changed |
| Create | Write a template, insert placeholders, pick up to 5 tags with suggestions, save as draft or publish, preview exactly what users will see |
| Versions | Editing the text creates version N+1; view the line-by-line changes between versions; restore an old version (non-destructive) |
| Community | Like, bookmark, rate (1-5, not your own), comment, follow creators, notifications |
| Privacy | Drafts and moderator-hidden prompts are visible only to their owner and admins, on every endpoint |
| Admin | Reports and moderation, hide/restore/delete prompts, users and roles (with safe deletion), categories, suggested models, tags (rename, merge, delete), activity log |
| Analytics | The six DBMS use cases, run live, each with the exact SQL shown |

## 2. Technology

React 18 + Vite 5 + Tailwind CSS 3 · Node.js + Express 4 · MySQL 8 via `mysql2` (parameterised SQL, no ORM) · JWT
login with bcrypt password hashes · Recharts.

## 3. Folder structure

```
promptforge/
├─ client/                       React app
│  ├─ src/pages/                 one file per page (Home, Explore, PromptDetails, Admin…)
│  ├─ src/components/            PromptCustomizer, PromptForm, TagInput, admin/* …
│  ├─ src/utils/placeholders.js  the {{placeholder}} engine (unit-tested)
│  └─ tests/                     npm test (Node's built-in test runner)
├─ server/                       Express API
│  ├─ controllers/ routes/ middleware/
│  ├─ utils/visibility.js        the single "who can see which prompt" rule
│  ├─ sql/useCases.js            the six DBMS use cases (one source of truth)
│  ├─ db/                        setup.js (fresh DB), migrate.js (existing DB)
│  ├─ scripts/                   demo passwords, admin promotion
│  └─ test/                      automated tests
├─ database/
│  ├─ schema.sql indexes.sql seed.sql sample_queries.sql
│  ├─ migrations/                001–006 safe migrations, 099 cleanup DRAFT
│  └─ library/                   library.js (all demo content) + build.js (generates 002–006)
└─ docs/                         MIGRATIONS.md, VIVA_GUIDE.md, DEMO_DATA.md, CHANGES.md
```

## 4. Run it on Windows (PowerShell)

Prerequisites: Node.js 18 or newer, MySQL 8 running locally.

### First time on this machine
```powershell
cd server
npm install
cd ..\client
npm install
cd ..
copy server\.env.example server\.env   # only if you don't already have server\.env
notepad server\.env                     # DB_PASSWORD, and a long random JWT_SECRET
```
> If your existing `server\.env` still has `JWT_SECRET=promptforge_super_secret_jwt_key_2026_dbms_academic`,
> replace it with your own random text. That value was published, and the server now refuses it.

### Update your EXISTING database (keeps your data)
Follow **[docs/MIGRATIONS.md](docs/MIGRATIONS.md)**. Short version:
```powershell
mysqldump -u root -p promptforge_db > backup_before_migration.sql
cd server
npm run db:migrate              # lists the migrations, changes nothing
npm run db:migrate -- --all     # runs 001-006 (each is safe to re-run)
npm run demo:passwords          # sets a password for the 5 demo accounts, prints it once
```

### Or create a brand-new database
```powershell
cd server
npm run db:setup     # refuses if the database already has users (it would drop tables)
```

### Start
```powershell
# Terminal 1
cd server
npm start            # http://localhost:5000/api/health should say "connected": true

# Terminal 2
cd client
npm run dev          # open http://localhost:3000
```

## 5. Accounts

* **Admin**: Hrishikesh Khanna (`hrishikeshkhanna17@gmail.com`). Register this account on the website with your own
  password, then run `npm run db:migrate -- 004_promote_admin.sql` or
  `npm run admin:promote -- hrishikeshkhanna17@gmail.com --yes`.
  Website roles (ADMIN/USER in the `roles` table) are separate from MySQL privileges.
* **Demo accounts** (role USER): Saksham Arora, Aryan Shresth, Dhruv Gangrade, Pranav Ranjith, Devansh Lingala, on the
  reserved domain `@demo.promptforge.test` (these can never be real mailboxes). They start locked;
  `npm run demo:passwords` sets one local password. Set `DEMO_MODE=true` in `server\.env` to list them on the sign-in
  page (names and emails only; never passwords, never admin accounts).
* Their likes, ratings, comments and follows are **seeded demonstration activity**, not genuine endorsements. See
  [docs/DEMO_DATA.md](docs/DEMO_DATA.md).

## 6. Tests

```powershell
cd server
npm test            # library check + 24 unit checks + 34 security/authorisation tests (no MySQL needed)
npm run test:sql    # runs the six use cases against your MySQL (read-only)
npm run test:live   # end-to-end checks against the running server (credentials from server\.env)
cd ..\client
npm test            # placeholder engine and version-diff tests
npm run build       # production build
```

## 7. The six DBMS use cases

| # | Use case | Main SQL concepts |
| :- | :--- | :--- |
| 1 | Top 10 prompts by engagement | derived tables (avoids join fan-out), LEFT JOIN, COALESCE, computed score |
| 2 | Most active creators in a month | UNION ALL, conditional aggregation, date windows, HAVING |
| 3 | Filter by model + category + tag | multi-table joins, many-to-many via `prompt_tags`, EXISTS, GROUP_CONCAT |
| 4 | Users with the most bookmarks | INNER JOIN, COUNT, GROUP BY, ORDER BY + LIMIT |
| 5 | Average rating by category | LEFT JOIN with the filter in ON, AVG/MIN/MAX |
| 6 | Monthly creation trend | WITH RECURSIVE (fills empty months), DATE_FORMAT |

The SQL lives in `server/sql/useCases.js`; the website, `npm run test:sql` and `database/sample_queries.sql` all use it.
See [docs/VIVA_GUIDE.md](docs/VIVA_GUIDE.md) for explanations.

## 8. Troubleshooting

| Symptom | Fix |
| :--- | :--- |
| `ER_ACCESS_DENIED_ERROR` | Wrong `DB_USER`/`DB_PASSWORD` in `server\.env` |
| `ECONNREFUSED 127.0.0.1:3306` | Start MySQL (Services → MySQL80, or XAMPP) |
| `Server does not support secure connection` | `DB_SSL=false` |
| Everyone is logged out after a restart | Set your own `JWT_SECRET` (16+ characters) in `server\.env` |
| "Can't reach the server" in the browser | Start the backend (Terminal 1) |
| Admin page missing after promotion | Refresh the page (roles are read on every request) |
| `vite` / `esbuild` / `rollup` errors | Delete `client\node_modules` and run `npm install` again |
