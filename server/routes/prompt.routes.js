const express = require('express');
const router = express.Router();
const promptController = require('../controllers/prompt.controller');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// Public or optional auth for exploring prompts
router.get('/', optionalAuth, promptController.getPrompts);
router.get('/:id', optionalAuth, promptController.getPromptById);

// Protected routes
router.post(
  '/',
  authenticateToken,
  validate({
    title: { required: true, min: 3, max: 255 },
    content: { required: true },
    category_id: { required: true, type: 'number' },
    model_id: { required: true, type: 'number' }
  }),
  promptController.createPrompt
);

router.put('/:id', authenticateToken, promptController.updatePrompt);
router.post('/:id/rollback/:versionNumber', authenticateToken, promptController.rollbackPromptVersion);
router.delete('/:id', authenticateToken, promptController.deletePrompt);

module.exports = router;
