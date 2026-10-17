/**
 * PromptForge — security & authorization tests (no MySQL needed).
 * Runs the real Express app with a fake database layer (test/helpers/fakeDb.js).
 *
 *   cd server
 *   npm run test:security
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-automated-tests-only';
process.env.DEMO_MODE = 'false';

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const fake = require('./helpers/fakeDb');
const app = require('../server');
const { visibilityCondition } = require('../utils/visibility');
const { normalizeTag, normalizeTagList } = require('../utils/tags');

const USERS = {
  1: { user_id: 1, name: 'Admin Person', email: 'admin@example.com', role_id: 1, role_name: 'ADMIN' },
  5: { user_id: 5, name: 'Normal User', email: 'user@example.com', role_id: 2, role_name: 'USER' },
  6: { user_id: 6, name: 'Other User', email: 'other@example.com', role_id: 2, role_name: 'USER' }
};
const tokenFor = (id) => jwt.sign({ userId: id, role: USERS[id].role_name }, process.env.JWT_SECRET, { expiresIn: '1h' });

let server;
let base;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      base = `http://127.0.0.1:${server.address().port}/api`;
      resolve();
    });
  });
});
test.after(() => server.close());

/** Default fake DB: authentication lookups resolve to USERS above. */
const setupAuth = () => {
  fake.reset();
  fake.on(/COUNT\(\*\) AS total/, [{ total: 0 }]);
  fake.on(/FROM users u\s+INNER JOIN roles r ON u\.role_id = r\.role_id\s+WHERE u\.user_id = \?/, (sql, params) =>
    USERS[params[0]] ? [USERS[params[0]]] : []
  );
};

const call = async (method, path, { token, body } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

// ---------------------------------------------------------------- visibility rule
test('visibility rule: guest sees only published + unmoderated prompts', () => {
  const v = visibilityCondition(null);
  assert.match(v.sql, /p\.status = 'published' AND p\.is_moderated = FALSE/);
  assert.doesNotMatch(v.sql, /user_id/);
  assert.deepEqual(v.params, []);
});

test('visibility rule: user also sees their own prompts', () => {
  const v = visibilityCondition({ userId: 5, role: 'USER' });
  assert.match(v.sql, /OR p\.user_id = \?/);
  assert.deepEqual(v.params, [5]);
});

test('visibility rule: admin sees everything', () => {
  assert.equal(visibilityCondition({ userId: 1, role: 'ADMIN' }).sql, '1 = 1');
});

// ---------------------------------------------------------------- draft privacy
test("guest asking for status=draft still gets the public-only rule (cannot list others' drafts)", async () => {
  setupAuth();
  const r = await call('GET', '/prompts?status=draft');
  assert.equal(r.status, 200);
  const list = fake.sqlMatching(/FROM prompts p\s+INNER JOIN users u/)[0];
  assert.ok(list, 'list query ran');
  assert.match(list.sql, /p\.status = 'published' AND p\.is_moderated = FALSE/);
  assert.match(list.sql, /p\.status = \?/);
});

test("logged-in user with status=all gets public + own rule bound to THEIR id", async () => {
  setupAuth();
  const r = await call('GET', '/prompts?status=all', { token: tokenFor(5) });
  assert.equal(r.status, 200);
  const list = fake.sqlMatching(/FROM prompts p\s+INNER JOIN users u/)[0];
  assert.match(list.sql, /OR p\.user_id = \?/);
  assert.ok(list.params.includes(5));
});

test('invalid status filter is rejected', async () => {
  setupAuth();
  const r = await call('GET', '/prompts?status=secret');
  assert.equal(r.status, 400);
});

test('limit is clamped to 50', async () => {
  setupAuth();
  await call('GET', '/prompts?limit=100000');
  const list = fake.sqlMatching(/LIMIT \? OFFSET \?/)[0];
  assert.equal(list.params[list.params.length - 2], 50);
});

test('private prompt detail returns 404 (existence not revealed)', async () => {
  setupAuth();
  fake.on(/WHERE p\.prompt_id = \? AND/, []); // DB returns nothing because the visibility rule filtered it
  const r = await call('GET', '/prompts/42');
  assert.equal(r.status, 404);
  const detail = fake.sqlMatching(/WHERE p\.prompt_id = \? AND/)[0];
  assert.match(detail.sql, /p\.status = 'published' AND p\.is_moderated = FALSE/);
});

// ---------------------------------------------------------------- interactions
test('liking a prompt you cannot see returns 404 and inserts nothing', async () => {
  setupAuth();
  fake.on(/FROM prompts p\s+WHERE p\.prompt_id = \? AND/, []);
  const r = await call('POST', '/prompts/42/like', { token: tokenFor(5) });
  assert.equal(r.status, 404);
  assert.equal(fake.sqlMatching(/INSERT IGNORE INTO likes/).length, 0);
});

test('rating your own prompt is refused', async () => {
  setupAuth();
  fake.on(/FROM prompts p\s+WHERE p\.prompt_id = \? AND/, [
    { prompt_id: 9, user_id: 5, title: 'Mine', status: 'published', is_moderated: 0 }
  ]);
  const r = await call('POST', '/prompts/9/rate', { token: tokenFor(5), body: { rating: 5 } });
  assert.equal(r.status, 400);
  assert.equal(fake.sqlMatching(/INSERT INTO ratings/).length, 0);
});

test('rating outside 1-5 is refused', async () => {
  setupAuth();
  const r = await call('POST', '/prompts/9/rate', { token: tokenFor(5), body: { rating: 9 } });
  assert.equal(r.status, 400);
});

test('commenting on a draft (even your own) is refused', async () => {
  setupAuth();
  fake.on(/FROM prompts p\s+WHERE p\.prompt_id = \? AND/, [
    { prompt_id: 9, user_id: 5, title: 'Draft', status: 'draft', is_moderated: 0 }
  ]);
  const r = await call('POST', '/prompts/9/comments', { token: tokenFor(5), body: { comment_text: 'hi' } });
  assert.equal(r.status, 400);
});

// ---------------------------------------------------------------- ownership
test("a USER cannot edit someone else's prompt", async () => {
  setupAuth();
  fake.on(/SELECT prompt_id, user_id FROM prompts WHERE prompt_id = \? FOR UPDATE/, [{ prompt_id: 3, user_id: 6 }]);
  const r = await call('PUT', '/prompts/3', { token: tokenFor(5), body: { title: 'Hacked title' } });
  assert.equal(r.status, 403);
  assert.equal(fake.sqlMatching(/UPDATE prompts/).length, 0);
  assert.equal(fake.sqlMatching(/ROLLBACK/).length, 1);
});

test("a USER cannot delete someone else's prompt", async () => {
  setupAuth();
  fake.on(/SELECT prompt_id, user_id, title FROM prompts WHERE prompt_id = \?/, [{ prompt_id: 3, user_id: 6, title: 'x' }]);
  const r = await call('DELETE', '/prompts/3', { token: tokenFor(5) });
  assert.equal(r.status, 403);
  assert.equal(fake.sqlMatching(/DELETE FROM prompts/).length, 0);
});

test('editing your own prompt with new content creates the next version', async () => {
  setupAuth();
  fake.on(/SELECT prompt_id, user_id FROM prompts WHERE prompt_id = \? FOR UPDATE/, [{ prompt_id: 3, user_id: 5 }]);
  fake.on(/SELECT version_number, content FROM prompt_versions/, [{ version_number: 2, content: 'old text' }]);
  const r = await call('PUT', '/prompts/3', { token: tokenFor(5), body: { content: 'new text', change_notes: 'Clearer' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.newVersion, 3);
  const ins = fake.sqlMatching(/INSERT INTO prompt_versions/)[0];
  assert.deepEqual(ins.params.slice(0, 2), [3, 3]);
  assert.equal(fake.sqlMatching(/COMMIT/).length, 1);
});

test('more than 5 tags is rejected', async () => {
  setupAuth();
  fake.on(/FROM categories WHERE category_id/, [{ category_id: 1 }]);
  fake.on(/FROM ai_models WHERE model_id/, [{ model_id: 1 }]);
  const r = await call('POST', '/prompts', {
    token: tokenFor(5),
    body: { title: 'A title', content: 'x', category_id: 1, model_id: 1, tags: ['a1', 'b2', 'c3', 'd4', 'e5', 'f6'] }
  });
  assert.equal(r.status, 400);
  assert.match(r.body.message, /at most 5 tags/);
});

// ---------------------------------------------------------------- roles & admin
test('admin endpoints: guest -> 401, USER -> 403, ADMIN -> 200', async () => {
  setupAuth();
  assert.equal((await call('GET', '/admin/users')).status, 401);
  assert.equal((await call('GET', '/admin/users', { token: tokenFor(5) })).status, 403);
  assert.equal((await call('GET', '/admin/users', { token: tokenFor(1) })).status, 200);
});

test('category/model management is ADMIN-only on the backend', async () => {
  setupAuth();
  assert.equal((await call('POST', '/categories', { token: tokenFor(5), body: { name: 'X' } })).status, 403);
  assert.equal((await call('POST', '/models', { token: tokenFor(5), body: { model_name: 'X', provider: 'Y' } })).status, 403);
});

test('registration always creates a USER (role_id 2), even if the body asks for admin', async () => {
  setupAuth();
  fake.on(/SELECT user_id FROM users WHERE email = \?/, []);
  const r = await call('POST', '/auth/register', {
    body: { name: 'New Person', email: 'new@example.com', password: 'longenough1', confirmPassword: 'longenough1', role_id: 1, role: 'ADMIN' }
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.user.role, 'USER');
  const ins = fake.sqlMatching(/INSERT INTO users/)[0];
  assert.equal(ins.params[0], 2);
});

test('a token signed with the OLD hard-coded secret is rejected', async () => {
  setupAuth();
  const forged = jwt.sign({ userId: 1, role: 'ADMIN' }, 'promptforge_super_secret_jwt_key_2026_dbms_academic');
  const r = await call('GET', '/admin/users', { token: forged });
  assert.equal(r.status, 403);
});

test('public creator profile does not expose email; owner and admin can see it', async () => {
  setupAuth();
  fake.on(/AS is_following/, [{ user_id: 6, name: 'Other User', email: 'other@example.com', role: 'USER' }]);
  const guest = await call('GET', '/users/6/profile');
  assert.equal(guest.status, 200);
  assert.equal(guest.body.creator.email, undefined);
  const self = await call('GET', '/users/6/profile', { token: tokenFor(6) });
  assert.equal(self.body.creator.email, 'other@example.com');
});

test('demo-accounts endpoint is off unless DEMO_MODE=true', async () => {
  setupAuth();
  assert.equal((await call('GET', '/auth/demo-accounts')).status, 404);
});

test('login is throttled after repeated failures', async () => {
  setupAuth();
  fake.on(/WHERE u\.email = \?/, []);
  let last;
  for (let i = 0; i < 10; i++) {
    last = await call('POST', '/auth/login', { body: { email: 'victim@example.com', password: 'wrong' } });
  }
  assert.equal(last.status, 429);
});

// ---------------------------------------------------------------- tags
test('tag normalisation', () => {
  assert.equal(normalizeTag('  Open Book Exam '), 'open-book-exam');
  assert.equal(normalizeTag('#React'), 'react');
  assert.equal(normalizeTag('node_js!!'), 'node-js');
  assert.deepEqual(normalizeTagList(['React', 'react', '#REACT']).tags, ['react']);
});

// ---------------------------------------------------------------- admin safety (Batch 2)
test('admin cannot change their own role', async () => {
  setupAuth();
  const r = await call('PUT', '/admin/users/1/role', { token: tokenFor(1), body: { role_id: 2 } });
  assert.equal(r.status, 400);
});

test('the last admin cannot be demoted', async () => {
  setupAuth();
  fake.on(/SELECT role_id, role_name FROM roles WHERE role_id = \?/, [{ role_id: 2, role_name: 'USER' }]);
  fake.on(/SELECT u\.user_id, u\.name, r\.role_name FROM users u/, [{ user_id: 7, name: 'Only Admin', role_name: 'ADMIN' }]);
  fake.on(/COUNT\(\*\) AS n FROM users u INNER JOIN roles r/, [{ n: 1 }]);
  const r = await call('PUT', '/admin/users/7/role', { token: tokenFor(1), body: { role_id: 2 } });
  assert.equal(r.status, 400);
  assert.equal(fake.sqlMatching(/UPDATE users SET role_id/).length, 0);
});

test('promoting a USER to ADMIN updates role_id and writes an activity log', async () => {
  setupAuth();
  fake.on(/SELECT role_id, role_name FROM roles WHERE role_id = \?/, [{ role_id: 1, role_name: 'ADMIN' }]);
  fake.on(/SELECT u\.user_id, u\.name, r\.role_name FROM users u/, [{ user_id: 6, name: 'Other User', role_name: 'USER' }]);
  const r = await call('PUT', '/admin/users/6/role', { token: tokenFor(1), body: { role_id: 1 } });
  assert.equal(r.status, 200);
  assert.deepEqual(fake.sqlMatching(/UPDATE users SET role_id/)[0].params, [1, 6]);
  assert.equal(fake.sqlMatching(/INSERT INTO activity_logs/).length, 1);
});

test('deleting a user who wrote versions of other people\'s prompts is refused and rolled back', async () => {
  setupAuth();
  fake.on(/FROM users u INNER JOIN roles r ON r\.role_id = u\.role_id WHERE u\.user_id = \? FOR UPDATE/, [
    { user_id: 6, name: 'Other User', email: 'o@x.com', role_name: 'USER' }
  ]);
  fake.on(/AS blocking_versions/, [{ prompts: 2, blocking_versions: 3 }]);
  const r = await call('DELETE', '/admin/users/6', { token: tokenFor(1) });
  assert.equal(r.status, 409);
  assert.equal(fake.sqlMatching(/DELETE FROM users/).length, 0);
  assert.equal(fake.sqlMatching(/ROLLBACK/).length, 1);
});

test("safe user deletion removes the user's prompts first, then the user, in one transaction", async () => {
  setupAuth();
  fake.on(/FROM users u INNER JOIN roles r ON r\.role_id = u\.role_id WHERE u\.user_id = \? FOR UPDATE/, [
    { user_id: 6, name: 'Other User', email: 'o@x.com', role_name: 'USER' }
  ]);
  fake.on(/AS blocking_versions/, [{ prompts: 2, blocking_versions: 0 }]);
  const r = await call('DELETE', '/admin/users/6', { token: tokenFor(1) });
  assert.equal(r.status, 200);
  const order = fake.calls.map((c) => c.sql).filter((s) => /DELETE FROM (prompts|users)|COMMIT/.test(s));
  assert.match(order[0], /DELETE FROM prompts WHERE user_id/);
  assert.match(order[1], /DELETE FROM users WHERE user_id/);
  assert.equal(order[2], 'COMMIT');
});

test('admin cannot delete their own account', async () => {
  setupAuth();
  assert.equal((await call('DELETE', '/admin/users/1', { token: tokenFor(1) })).status, 400);
});

test('deleting a category that still has prompts is refused with a clear message', async () => {
  setupAuth();
  fake.on(/AS uses FROM categories c/, [{ name: 'Gaming', uses: 3 }]);
  const r = await call('DELETE', '/categories/7', { token: tokenFor(1) });
  assert.equal(r.status, 409);
  assert.match(r.body.message, /used by 3 prompt/);
  assert.equal(fake.sqlMatching(/DELETE FROM categories/).length, 0);
});

test('renaming a tag onto an existing name asks for a merge; merge moves links in a transaction', async () => {
  setupAuth();
  fake.on(/SELECT tag_id, tag_name FROM tags WHERE tag_id = \? FOR UPDATE/, [{ tag_id: 4, tag_name: 'reactjs' }]);
  fake.on(/SELECT tag_id FROM tags WHERE tag_name = \?/, [{ tag_id: 2 }]);
  const ask = await call('PUT', '/tags/4', { token: tokenFor(1), body: { tag_name: 'React' } });
  assert.equal(ask.status, 409);
  assert.equal(ask.body.code, 'TAG_EXISTS');

  const merged = await call('PUT', '/tags/4', { token: tokenFor(1), body: { tag_name: 'React', merge: true } });
  assert.equal(merged.status, 200);
  assert.equal(fake.sqlMatching(/INSERT IGNORE INTO prompt_tags \(prompt_id, tag_id\) SELECT/).length, 1);
  assert.equal(fake.sqlMatching(/COMMIT/).length, 1);
});

test('tag management is ADMIN-only', async () => {
  setupAuth();
  assert.equal((await call('PUT', '/tags/4', { token: tokenFor(5), body: { tag_name: 'x1' } })).status, 403);
  assert.equal((await call('DELETE', '/tags/4', { token: tokenFor(5) })).status, 403);
  assert.equal((await call('POST', '/tags', { token: tokenFor(5), body: { tag_name: 'x1' } })).status, 403);
});

test('dismissing a report does not un-hide a prompt another approved report hid', async () => {
  setupAuth();
  fake.on(/SELECT report_id, prompt_id FROM reports WHERE report_id = \? FOR UPDATE/, [{ report_id: 2, prompt_id: 9 }]);
  fake.on(/status = 'approved' AND report_id <> \?/, [{ n: 1 }]);
  const r = await call('PUT', '/reports/2/status', { token: tokenFor(1), body: { status: 'rejected' } });
  assert.equal(r.status, 200);
  assert.equal(fake.sqlMatching(/UPDATE prompts SET is_moderated = FALSE/).length, 0);
});
