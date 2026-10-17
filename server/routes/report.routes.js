const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// User submit report
router.post('/', authenticateToken, reportController.createReport);

// Admin view and moderate reports
router.get('/', authenticateToken, requireRole('ADMIN'), reportController.getReports);
router.put('/:id/status', authenticateToken, requireRole('ADMIN'), reportController.updateReportStatus);

module.exports = router;
