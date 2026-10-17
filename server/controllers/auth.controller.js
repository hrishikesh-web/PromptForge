const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { getJwtSecret, getJwtExpiry } = require('../config/jwt');
const { isDemoMode, DEMO_EMAIL_DOMAIN } = require('../config/demo');
const { logActivity } = require('../utils/activityLogger');
const { LIMITS, isBlank, tooLong } = require('../utils/validators');
const throttle = require('../utils/loginThrottle');

const USER_ROLE_ID = 2; // roles: 1 = ADMIN, 2 = USER. New accounts are ALWAYS USER.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signToken = (userId, role) => jwt.sign({ userId, role }, getJwtSecret(), { expiresIn: getJwtExpiry() });

/** POST /api/auth/register — creates a USER account (never ADMIN). */
const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, bio } = req.body;

    if (isBlank(name) || isBlank(email) || typeof password !== 'string' || password === '') {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    }
    const cleanName = name.trim();
    const cleanEmail = email.toLowerCase().trim();

    const errors = [
      cleanName.length < 2 ? 'Name must be at least 2 characters.' : null,
      tooLong(cleanName, LIMITS.userName, 'Name'),
      !EMAIL_RE.test(cleanEmail) ? 'Enter a valid email address.' : null,
      tooLong(cleanEmail, LIMITS.email, 'Email'),
      password.length < 8 ? 'Password must be at least 8 characters.' : null,
      password.length > 72 ? 'Password must not exceed 72 characters.' : null,
      password !== confirmPassword ? 'Passwords do not match.' : null,
      tooLong(bio, LIMITS.bio, 'Bio')
    ].filter(Boolean);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    // The .test domain is reserved for seeded demo accounts.
    if (cleanEmail.endsWith(`@${DEMO_EMAIL_DOMAIN}`)) {
      return res.status(400).json({ success: false, message: 'This email domain is reserved for demo accounts.' });
    }

    const existing = await query('SELECT user_id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'This email is already registered. Please sign in.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (role_id, name, email, password_hash, bio, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [USER_ROLE_ID, cleanName, cleanEmail, passwordHash, bio ? bio.trim() : null]
    );
    const newUserId = result.insertId;

    await logActivity({ userId: newUserId, action: 'REGISTER', tableName: 'users', recordId: newUserId });

    return res.status(201).json({
      success: true,
      message: 'Account created.',
      token: signToken(newUserId, 'USER'),
      user: { userId: newUserId, name: cleanName, email: cleanEmail, role: 'USER', bio: bio ? bio.trim() : null }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'This email is already registered. Please sign in.' });
    }
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

/** POST /api/auth/login */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (isBlank(email) || typeof password !== 'string' || password === '') {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const key = throttle.keyFor(req.ip, cleanEmail);
    if (throttle.isBlocked(key)) {
      return res.status(429).json({ success: false, message: 'Too many failed attempts. Please wait 15 minutes and try again.' });
    }

    const users = await query(
      `SELECT u.user_id, u.name, u.email, u.password_hash, u.bio, r.role_name
       FROM users u
       INNER JOIN roles r ON u.role_id = r.role_id
       WHERE u.email = ?`,
      [cleanEmail]
    );

    // Same message for unknown email and wrong password (does not reveal which emails exist).
    const user = users[0];
    const isMatch = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!isMatch) {
      throttle.recordFailure(key);
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    throttle.clearFailures(key);

    await logActivity({ userId: user.user_id, action: 'LOGIN', tableName: 'users', recordId: user.user_id });

    return res.status(200).json({
      success: true,
      message: 'Signed in.',
      token: signToken(user.user_id, user.role_name),
      user: { userId: user.user_id, name: user.name, email: user.email, role: user.role_name, bio: user.bio }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during sign in.' });
  }
};

/** GET /api/auth/me — the signed-in user's own profile and counters. */
const getMe = async (req, res) => {
  try {
    const rows = await query(
      `SELECT
         u.user_id, u.name, u.email, u.bio, u.created_at, r.role_name AS role,
         (SELECT COUNT(*) FROM prompts WHERE user_id = u.user_id) AS total_prompts,
         (SELECT COUNT(*) FROM bookmarks WHERE user_id = u.user_id) AS total_bookmarks,
         (SELECT COUNT(*) FROM likes WHERE user_id = u.user_id) AS total_likes_given,
         (SELECT COUNT(*) FROM follows WHERE following_id = u.user_id) AS followers_count,
         (SELECT COUNT(*) FROM follows WHERE follower_id = u.user_id) AS following_count
       FROM users u
       INNER JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = ?`,
      [req.user.userId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.status(200).json({ success: true, user: rows[0] });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({ success: false, message: 'Could not load your profile.' });
  }
};

/** PUT /api/auth/profile — update your own display name and bio. */
const updateProfile = async (req, res) => {
  try {
    const { name, bio } = req.body;
    const errors = [];
    if (name !== undefined) {
      if (isBlank(name) || name.trim().length < 2) errors.push('Name must be at least 2 characters.');
      const e = tooLong(name, LIMITS.userName, 'Name');
      if (e) errors.push(e);
    }
    if (bio !== undefined && bio !== null) {
      if (typeof bio !== 'string') errors.push('Bio must be text.');
      const e = tooLong(bio, LIMITS.bio, 'Bio');
      if (e) errors.push(e);
    }
    if (errors.length > 0) return res.status(400).json({ success: false, message: errors[0], errors });

    await query(
      'UPDATE users SET name = COALESCE(?, name), bio = COALESCE(?, bio), updated_at = NOW() WHERE user_id = ?',
      [name !== undefined ? name.trim() : null, bio !== undefined && bio !== null ? bio.trim() : null, req.user.userId]
    );
    await logActivity({ userId: req.user.userId, action: 'UPDATE_PROFILE', tableName: 'users', recordId: req.user.userId });

    return res.status(200).json({ success: true, message: 'Profile updated.' });
  } catch (error) {
    console.error('updateProfile error:', error);
    return res.status(500).json({ success: false, message: 'Could not update your profile.' });
  }
};

/**
 * GET /api/auth/demo-accounts — only when DEMO_MODE=true on a non-production server.
 * Lists seeded demo USER accounts (name + email) so the login page can pre-fill
 * the email. Passwords are never returned; ADMIN accounts are never listed.
 */
const getDemoAccounts = async (req, res) => {
  if (!isDemoMode()) return res.status(404).json({ success: false, message: 'Demo mode is off.' });
  try {
    const rows = await query(
      `SELECT u.name, u.email
       FROM users u
       INNER JOIN roles r ON u.role_id = r.role_id
       WHERE u.email LIKE ? AND r.role_name = 'USER'
       ORDER BY u.user_id`,
      [`%@${DEMO_EMAIL_DOMAIN}`]
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('getDemoAccounts error:', error);
    return res.status(500).json({ success: false, message: 'Could not load demo accounts.' });
  }
};

module.exports = { register, login, getMe, updateProfile, getDemoAccounts };
