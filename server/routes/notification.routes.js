const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, notificationController.getNotifications);
router.get('/unread-count', authenticateToken, notificationController.getUnreadCount);
router.put('/:id/read', authenticateToken, notificationController.markAsRead);
router.put('/mark-all-read', authenticateToken, notificationController.markAllAsRead);

module.exports = router;
