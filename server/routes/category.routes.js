const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.get('/', categoryController.getCategories);
router.post('/', authenticateToken, requireRole('ADMIN'), categoryController.createCategory);
router.put('/:id', authenticateToken, requireRole('ADMIN'), categoryController.updateCategory);
router.delete('/:id', authenticateToken, requireRole('ADMIN'), categoryController.deleteCategory);

module.exports = router;
