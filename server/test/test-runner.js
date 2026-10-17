/**
 * PromptForge — Automated Verification Test Suite
 * Tests Route Registration, Validation Middleware, JWT, Password Hashing, and SQL File Integrity
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Set test environment
process.env.NODE_ENV = 'test';

// Import server app
const app = require('../server');
const { validate } = require('../middleware/validate');
const { requireRole } = require('../middleware/rbac');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`  ✔ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✖ FAIL: ${testName}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log(' PROMPTFORGE AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  // 1. Password Hashing & Bcrypt Verification
  console.log('--- 1. Cryptographic Security & Password Hashing ---');
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('TestSecret@123', salt);
  const matchSuccess = await bcrypt.compare('TestSecret@123', hash);
  const matchFail = await bcrypt.compare('WrongPassword', hash);

  assert(matchSuccess === true, 'Bcrypt successfully verifies correct password');
  assert(matchFail === false, 'Bcrypt rejects incorrect password');

  // The repository must not contain usable demo passwords any more
  const seedText = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'seed.sql'), 'utf8');
  assert(!/\$2[aby]\$\d{2}\$/.test(seedText), 'seed.sql contains no password hashes');
  const accounts = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'migrations', '003_demo_accounts.sql'), 'utf8');
  const lockedHash = (accounts.match(/\$2a\$10\$[A-Za-z0-9./]{53}/) || [])[0];
  assert(Boolean(lockedHash) && !(await bcrypt.compare('Admin@123', lockedHash)) && !(await bcrypt.compare('User@123', lockedHash)),
    'Demo accounts start locked (old public passwords do not work)');

  // 2. JWT Generation & Verification
  console.log('\n--- 2. JWT Authentication Token Lifecyle ---');
  const secret = 'promptforge_super_secret_jwt_key_2026_dbms_academic';
  const payload = { userId: 42, role: 'ADMIN' };
  const token = jwt.sign(payload, secret, { expiresIn: '1h' });
  const decoded = jwt.verify(token, secret);

  assert(decoded.userId === 42, 'JWT payload decodes correct userId');
  assert(decoded.role === 'ADMIN', 'JWT payload decodes correct role');

  // 3. Validation Middleware Tests
  console.log('\n--- 3. Input Validation Middleware ---');
  const sampleSchema = {
    email: { required: true, type: 'email' },
    title: { required: true, min: 5 }
  };
  const validator = validate(sampleSchema);

  // Test failure on bad email
  let req = { body: { email: 'not-an-email', title: 'Valid Title' } };
  let statusResult = 200;
  let jsonResult = {};
  let res = {
    status: (s) => { statusResult = s; return res; },
    json: (j) => { jsonResult = j; }
  };
  let nextCalled = false;

  validator(req, res, () => { nextCalled = true; });
  assert(statusResult === 400 && jsonResult.success === false, 'Validator rejects malformed email address');

  // Test failure on short title
  req = { body: { email: 'user@example.com', title: 'Hi' } };
  statusResult = 200;
  nextCalled = false;
  validator(req, res, () => { nextCalled = true; });
  assert(statusResult === 400, 'Validator rejects string shorter than minimum length');

  // Test pass
  req = { body: { email: 'valid@example.com', title: 'Proper Title' } };
  nextCalled = false;
  validator(req, res, () => { nextCalled = true; });
  assert(nextCalled === true, 'Validator passes valid payload to next() handler');

  // 4. RBAC Authorization Middleware Tests
  console.log('\n--- 4. Role-Based Access Control (RBAC) Middleware ---');
  const adminGuard = requireRole('ADMIN');

  // Non-admin request
  req = { user: { userId: 5, role: 'USER' } };
  statusResult = 200;
  nextCalled = false;
  adminGuard(req, res, () => { nextCalled = true; });
  assert(statusResult === 403, 'RBAC middleware denies USER access to ADMIN route');

  // Admin request
  req = { user: { userId: 1, role: 'ADMIN' } };
  nextCalled = false;
  adminGuard(req, res, () => { nextCalled = true; });
  assert(nextCalled === true, 'RBAC middleware grants ADMIN access to ADMIN route');

  // 5. Database SQL Artifacts Integrity Tests
  console.log('\n--- 5. Database SQL Artifacts Integrity ---');
  const dbDir = path.join(__dirname, '..', '..', 'database');
  const schemaPath = path.join(dbDir, 'schema.sql');
  const indexesPath = path.join(dbDir, 'indexes.sql');
  const seedPath = path.join(dbDir, 'seed.sql');
  const queriesPath = path.join(dbDir, 'sample_queries.sql');

  assert(fs.existsSync(schemaPath), 'schema.sql file exists on disk');
  assert(fs.existsSync(indexesPath), 'indexes.sql file exists on disk');
  assert(fs.existsSync(seedPath), 'seed.sql file exists on disk');
  assert(fs.existsSync(queriesPath), 'sample_queries.sql file exists on disk');

  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  const requiredTables = [
    'roles', 'users', 'categories', 'ai_models', 'prompts', 'prompt_versions',
    'tags', 'prompt_tags', 'likes', 'bookmarks', 'comments', 'ratings',
    'follows', 'notifications', 'reports', 'activity_logs'
  ];

  let allTablesPresent = true;
  for (const table of requiredTables) {
    if (!schemaContent.includes(`CREATE TABLE \`${table}\``)) {
      allTablesPresent = false;
      console.error(`  Missing table: ${table}`);
    }
  }
  assert(allTablesPresent, 'All 16 normalized tables defined in schema.sql');

  const queriesContent = fs.readFileSync(queriesPath, 'utf8');
  for (let n = 1; n <= 6; n++) {
    assert(queriesContent.includes(`USE CASE ${n}:`), `sample_queries.sql contains PPT Use Case ${n}`);
  }
  assert(/`role_id` INT NOT NULL DEFAULT 2/.test(schemaContent), 'users.role_id defaults to 2 (USER), not ADMIN');

  // 6. Express Routes Registration Verification
  console.log('\n--- 6. Express Routes Registration ---');
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push(middleware.route.path);
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push(handler.route.path);
        }
      });
    }
  });

  assert(routes.length > 20, `Server registers extensive API endpoints (detected ${routes.length} route endpoints)`);

  console.log('\n====================================================');
  console.log(` SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('====================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
