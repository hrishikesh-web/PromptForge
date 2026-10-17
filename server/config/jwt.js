const crypto = require('crypto');

/**
 * Returns the secret used to sign and verify login tokens (JWT).
 *
 * Previously the code fell back to a hard-coded secret that is published in the
 * repository, which would let anyone forge an ADMIN token. Now:
 *  - JWT_SECRET from server/.env is used when it is at least 16 characters.
 *  - In production, a missing/short secret is a startup error.
 *  - In development, a random secret is generated for this process only
 *    (everyone is logged out when the server restarts) and a warning is printed.
 */
let cachedSecret = null;

// Values that were published in old .env.example files. Anyone could forge tokens with them.
const PUBLIC_SECRETS = new Set(['promptforge_super_secret_jwt_key_2026_dbms_academic', 'change_me_to_a_long_random_string']);

const getJwtSecret = () => {
  if (cachedSecret) return cachedSecret;

  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && PUBLIC_SECRETS.has(fromEnv) && process.env.NODE_ENV !== 'test') {
    console.warn('⚠ JWT_SECRET in server/.env is a published example value. Replace it with your own long random string.');
  }
  if (fromEnv && fromEnv.length >= 16 && !PUBLIC_SECRETS.has(fromEnv)) {
    cachedSecret = fromEnv;
    return cachedSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set (at least 16 characters) in production.');
  }

  cachedSecret = crypto.randomBytes(32).toString('hex');
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠ JWT_SECRET is missing or shorter than 16 characters in server/.env.');
    console.warn('  Using a temporary random secret: all users will be logged out when the server restarts.');
  }
  return cachedSecret;
};

const getJwtExpiry = () => process.env.JWT_EXPIRES_IN || '7d';

module.exports = { getJwtSecret, getJwtExpiry };
