const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Every route in this file requires a valid login AND the ADMIN role.
// The check happens here on the server, not just by hiding buttons in React.
router.use(authenticateToken, requireRole('ADMIN'));

router.get('/overview', adminController.getAdminOverview);
router.get('/roles', adminController.getRoles);
router.get('/users', adminController.getUsers);
router.put('/users/:userId/role', adminController.updateUserRole);
router.get('/users/:userId/delete-impact', adminController.getDeleteImpact);
router.delete('/users/:userId', adminController.deleteUser);
router.put('/prompts/:id/moderation', adminController.setPromptModeration);
router.get('/logs', adminController.getActivityLogs);

module.exports = router;
