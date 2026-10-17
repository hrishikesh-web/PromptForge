/**
 * Test helper: replaces config/db.js with an in-memory fake BEFORE the app loads,
 * so route + middleware + controller logic can be tested without MySQL.
 *
 * Each test registers handlers:  fake.on(/SELECT .* FROM users/, (sql, params) => rows)
 * The first handler whose regex matches the SQL answers; unmatched SQL returns [].
 * Every executed statement is recorded in fake.calls for assertions.
 */
const path = require('path');

const handlers = [];
const calls = [];

const run = async (sql, params = []) => {
  calls.push({ sql, params });
  for (const h of handlers) {
    if (h.re.test(sql)) return typeof h.reply === 'function' ? h.reply(sql, params) : h.reply;
  }
  if (/^\s*(INSERT|UPDATE|DELETE)/i.test(sql)) return { insertId: 1, affectedRows: 1 };
  return [];
};

const fake = {
  query: run,
  getTransaction: async () => ({
    query: run,
    commit: async () => calls.push({ sql: 'COMMIT', params: [] }),
    rollback: async () => calls.push({ sql: 'ROLLBACK', params: [] }),
    release: () => {}
  }),
  checkConnection: async () => ({ connected: true }),
  pool: { end: async () => {} }
};

const dbPath = path.resolve(__dirname, '..', '..', 'config', 'db.js');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fake };

module.exports = {
  on(re, reply) {
    handlers.unshift({ re, reply });
  },
  reset() {
    handlers.length = 0;
    calls.length = 0;
  },
  calls,
  sqlMatching(re) {
    return calls.filter((c) => re.test(c.sql));
  }
};
