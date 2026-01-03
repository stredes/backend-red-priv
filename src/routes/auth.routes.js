const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.get('/me', authenticateToken, authController.me);
router.post('/verify-email', authController.verifyEmail);
router.post('/reset-password', authenticateToken, authController.resetPassword);
router.post('/refresh', authLimiter, authController.refresh);

// Rutas para recuperación de contraseña
router.post('/request-password-reset', authLimiter, authController.requestPasswordReset);
router.post('/verify-reset-code', authLimiter, authController.verifyResetCode);
router.post('/confirm-password-reset', authLimiter, authController.confirmPasswordReset);

module.exports = router;
