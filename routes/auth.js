const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { adminProtect } = require('../middleware/adminAuth');
const {
  registerUser, loginUser, verifyEmail, forgotPassword, verifyResetOTP,
  resetPassword, getProfile, updateProfile,
  adminLogin, adminForgotPassword, adminVerifyResetOTP, adminResetPassword
} = require('../controllers/authController');

// User Auth
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOTP);
router.post('/reset-password', resetPassword);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

// Admin Auth
router.post('/admin/login', adminLogin);
router.post('/admin/forgot-password', adminForgotPassword);
router.post('/admin/verify-reset-otp', adminVerifyResetOTP);
router.post('/admin/reset-password', adminResetPassword);

module.exports = router;
