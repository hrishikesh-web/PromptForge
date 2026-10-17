const express = require('express');
const router = express.Router();
const modelController = require('../controllers/model.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.get('/', modelController.getModels);
router.post('/', authenticateToken, requireRole('ADMIN'), modelController.createModel);
router.put('/:id', authenticateToken, requireRole('ADMIN'), modelController.updateModel);
router.delete('/:id', authenticateToken, requireRole('ADMIN'), modelController.deleteModel);

module.exports = router;
