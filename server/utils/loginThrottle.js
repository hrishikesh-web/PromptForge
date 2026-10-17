/**
 * Very small in-memory brute-force guard for the login endpoint.
 * After MAX_FAILURES wrong passwords for the same email from the same IP within
 * WINDOW_MS, further attempts are refused until the window passes.
 * (In-memory is fine for a single local server; it resets on restart.)
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;
const failures = new Map(); // key -> { count, firstAt }

const keyFor = (ip, email) => `${ip || 'unknown'}|${String(email || '').toLowerCase()}`;

const isBlocked = (key) => {
  const entry = failures.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
};

const recordFailure = (key) => {
  const entry = failures.get(key);
  if (!entry || Date.now() - entry.firstAt > WINDOW_MS) {
    failures.set(key, { count: 1, firstAt: Date.now() });
  } else {
    entry.count += 1;
  }
};

const clearFailures = (key) => failures.delete(key);

module.exports = { keyFor, isBlocked, recordFailure, clearFailures, MAX_FAILURES };
