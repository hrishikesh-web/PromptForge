/**
 * Live end-to-end check against the RUNNING server (npm start) and your MySQL.
 * Read-only apart from logging in (which writes a LOGIN row to activity_logs).
 *
 *   cd server
 *   npm run test:live
 *
 * Credentials come from server/.env (never hard-coded):
 *   LIVE_ADMIN_EMAIL / LIVE_ADMIN_PASSWORD   your admin account
 *   DEMO_USER_PASSWORD                        the demo password (npm run demo:passwords)
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BASE = process.env.LIVE_BASE_URL || `http://localhost:${process.env.PORT || 5000}/api`;
const DEMO_USER = 'saksham.arora@demo.promptforge.test';
let passed = 0;
let total = 0;

const check = (cond, label) => {
  total++;
  if (cond) passed++;
  console.log(`  ${cond ? '✔' : '✖'} ${label}`);
};

const call = async (method, url, { token, body } = {}) => {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

(async () => {
  console.log(`PromptForge live check against ${BASE}\n`);

  console.log('Health');
  const health = await call('GET', '/health');
  check(health.status === 200 && health.body.database?.connected === true, 'Server is up and MySQL is connected');

  console.log('\nPublic browsing');
  const cats = await call('GET', '/categories');
  check(cats.status === 200 && cats.body.data.length >= 10, `Categories load (${cats.body.data?.length ?? 0})`);
  const list = await call('GET', '/prompts?limit=50&status=all');
  check(list.status === 200 && list.body.data.length > 0, `Prompts load (${list.body.pagination?.total ?? 0} visible to a guest)`);
  check(list.body.data.every((p) => p.status === 'published' && !p.is_moderated), 'A guest sees only published, unmoderated prompts (status=all is ignored)');
  const first = list.body.data[0];
  if (first) {
    const detail = await call('GET', `/prompts/${first.prompt_id}`);
    check(detail.status === 200 && Array.isArray(detail.body.data.versions), 'Prompt detail includes version history');
  }
  const uc = await call('GET', '/analytics/top-engagement');
  check(uc.status === 200 && typeof uc.body.query?.sql === 'string', 'Analytics returns rows and the SQL it ran');

  console.log('\nDemo user');
  if (!process.env.DEMO_USER_PASSWORD) {
    console.log('  (skipped: set DEMO_USER_PASSWORD in server/.env and run npm run demo:passwords)');
  } else {
    const login = await call('POST', '/auth/login', { body: { email: DEMO_USER, password: process.env.DEMO_USER_PASSWORD } });
    check(login.status === 200 && login.body.user?.role === 'USER', 'Demo user signs in with role USER');
    const token = login.body.token;
    if (token) {
      const mine = await call('GET', `/prompts?user_id=${login.body.user.userId}&status=draft`, { token });
      check(mine.status === 200 && mine.body.data.length >= 1, 'Demo user sees their own draft');
      const draft = mine.body.data[0];
      if (draft) {
        const asGuest = await call('GET', `/prompts/${draft.prompt_id}`);
        check(asGuest.status === 404, 'The same draft returns 404 for a guest (privacy)');
      }
      const admin = await call('GET', '/admin/users', { token });
      check(admin.status === 403, 'Demo user is refused by admin routes (403)');
    }
  }

  console.log('\nAdmin');
  if (!process.env.LIVE_ADMIN_EMAIL || !process.env.LIVE_ADMIN_PASSWORD) {
    console.log('  (skipped: set LIVE_ADMIN_EMAIL and LIVE_ADMIN_PASSWORD in server/.env)');
  } else {
    const login = await call('POST', '/auth/login', { body: { email: process.env.LIVE_ADMIN_EMAIL, password: process.env.LIVE_ADMIN_PASSWORD } });
    check(login.status === 200 && login.body.user?.role === 'ADMIN', 'Admin signs in with role ADMIN');
    if (login.body.token) {
      const users = await call('GET', '/admin/users', { token: login.body.token });
      check(users.status === 200 && users.body.data.every((u) => !('password_hash' in u)), 'Admin user list works and contains no password hashes');
    }
  }

  console.log(`\n${passed}/${total} checks passed.`);
  process.exit(passed === total ? 0 : 1);
})().catch((err) => {
  console.error(`\nCould not reach ${BASE}: ${err.message}. Is the server running (npm start)?`);
  process.exit(1);
});
