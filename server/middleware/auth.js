const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { getJwtSecret } = require('../config/jwt');

/**
 * Authentication middleware: verifies Bearer JWT token
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);

    // Verify user still exists in database and fetch active role
    const users = await query(
      `SELECT u.user_id, u.name, u.email, u.role_id, r.role_name 
       FROM users u 
       INNER JOIN roles r ON u.role_id = r.role_id 
       WHERE u.user_id = ?`,
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found or account deactivated.' });
    }

    req.user = {
      userId: users[0].user_id,
      name: users[0].name,
      email: users[0].email,
      roleId: users[0].role_id,
      role: users[0].role_name
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token has expired. Please login again.' });
    }
    if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
      return res.status(403).json({ success: false, message: 'Invalid or malformed token.' });
    }
    // Database or other server failure: do not report it as a bad token
    console.error('authenticateToken error:', error.message);
    return res.status(500).json({ success: false, message: 'Authentication check failed (database unavailable?).' });
  }
};

/**
 * Optional authentication: extracts user if token exists, otherwise proceeds as guest
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      req.user = null;
      return next();
    }

    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);

    const users = await query(
      `SELECT u.user_id, u.name, u.email, u.role_id, r.role_name 
       FROM users u 
       INNER JOIN roles r ON u.role_id = r.role_id 
       WHERE u.user_id = ?`,
      [decoded.userId]
    );

    if (users.length > 0) {
      req.user = {
        userId: users[0].user_id,
        name: users[0].name,
        email: users[0].email,
        roleId: users[0].role_id,
        role: users[0].role_name
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};
