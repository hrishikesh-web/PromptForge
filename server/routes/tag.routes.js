const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tag.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.get('/', tagController.getTags);
router.post('/', authenticateToken, requireRole('ADMIN'), tagController.createTag);
router.put('/:id', authenticateToken, requireRole('ADMIN'), tagController.updateTag);
router.delete('/:id', authenticateToken, requireRole('ADMIN'), tagController.deleteTag);

module.exports = router;
