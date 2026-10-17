/**
 * Role-Based Access Control (RBAC) middleware
 * Enforces role authorization strictly on the backend
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Action requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

module.exports = {
  requireRole
};
