const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.post(
  '/register',
  validate({
    name: { required: true, min: 2, max: 100 },
    email: { required: true, type: 'email', max: 150 },
    password: { required: true, min: 8, max: 72 }
  }),
  authController.register
);

router.post(
  '/login',
  validate({
    email: { required: true, type: 'email' },
    password: { required: true }
  }),
  authController.login
);

router.get('/me', authenticateToken, authController.getMe);
router.put('/profile', authenticateToken, authController.updateProfile);

// Local demonstration helper (404 unless DEMO_MODE=true and not production)
router.get('/demo-accounts', authController.getDemoAccounts);

module.exports = router;
