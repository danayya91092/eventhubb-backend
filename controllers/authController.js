const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const OTPVerification = require('../models/OTPVerification');
const ActivityLog = require('../models/ActivityLog');
const { sendMail, getOtpEmailTemplate } = require('../utils/mailer');
const { generateOTP, isDomainValid } = require('../utils/helpers');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

exports.registerUser = async (req, res) => {
  try {
    const { fullname, email, phone, password } = req.body;
    if (!fullname || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password required' });
    }
    if (!isDomainValid(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email domain' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    const user = await User.create({ fullname, email, phone, password });
    const otp = generateOTP();
    await OTPVerification.create({
      email: email.toLowerCase(), otp, type: 'email_verification',
      expires_at: new Date(Date.now() + 10 * 60 * 1000)
    });
    await sendMail(email, fullname, 'Verify your email', getOtpEmailTemplate(otp, fullname, 'email verification'));
    const token = generateToken(user._id);
    res.status(201).json({ success: true, message: 'Registration successful. Check email for OTP.', token, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (user.account_status !== 'active') {
      return res.status(403).json({
        success: false, message: user.account_status === 'suspended'
          ? `Account suspended. ${user.suspended_reason || ''}`
          : 'Account banned. Contact support.'
      });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    user.last_login = new Date();
    user.last_login_ip = req.ip;
    await user.save();
    const token = generateToken(user._id);
    res.json({ success: true, message: 'Login successful', token, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const record = await OTPVerification.findOne({
      email: email.toLowerCase(), otp, type: 'email_verification',
      verified_at: null, expires_at: { $gt: new Date() }
    });
    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
    record.verified_at = new Date();
    await record.save();
    await User.findOneAndUpdate({ email: email.toLowerCase() }, { email_status: 'verified', verified_at: new Date() });
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }
    const otp = generateOTP();
    await OTPVerification.create({
      email: email.toLowerCase(), otp, type: 'password_reset',
      expires_at: new Date(Date.now() + 10 * 60 * 1000)
    });
    user.reset_otp = otp;
    user.reset_otp_expiry = new Date(Date.now() + 10 * 60 * 1000);
    user.reset_otp_attempts = 0;
    await user.save();
    await sendMail(email, user.fullname, 'Password Reset OTP', getOtpEmailTemplate(otp, user.fullname, 'password reset'));
    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'Email not found' });
    if (user.reset_otp_attempts >= 5) {
      user.reset_otp = ''; user.reset_otp_expiry = null;
      await user.save();
      return res.status(400).json({ success: false, message: 'Too many attempts. Request a new OTP.' });
    }
    if (user.reset_otp !== otp || user.reset_otp_expiry < new Date()) {
      user.reset_otp_attempts += 1;
      await user.save();
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
    res.json({ success: true, message: 'OTP verified. You can reset your password.', resetToken: otp });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.reset_otp !== otp || user.reset_otp_expiry < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
    user.password = newPassword;
    user.reset_otp = ''; user.reset_otp_expiry = null; user.reset_otp_attempts = 0;
    user.password_reset_at = new Date();
    await user.save();
    res.json({ success: true, message: 'Password reset successful. You can now login.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProfile = async (req, res) => {
  res.json({ success: true, user: req.user });
};

exports.updateProfile = async (req, res) => {
  try {
    const { fullname, phone } = req.body;
    const user = await User.findById(req.user._id);
    if (fullname) user.fullname = fullname;
    if (phone) user.phone = phone;
    await user.save();
    res.json({ success: true, message: 'Profile updated', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin Auth
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (admin.status !== 'active') return res.status(403).json({ success: false, message: 'Account inactive' });
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    admin.last_login = new Date();
    await admin.save();
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    await ActivityLog.create({ admin: admin._id, action: 'admin_login', details: { email }, ip_address: req.ip });
    res.json({ success: true, message: 'Login successful', token, admin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.adminForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) return res.status(404).json({ success: false, message: 'Email not found' });
    const otp = generateOTP();
    admin.reset_otp = otp;
    admin.reset_otp_expiry = new Date(Date.now() + 10 * 60 * 1000);
    admin.reset_otp_attempts = 0;
    await admin.save();
    await sendMail(email, admin.username, 'Admin Password Reset OTP', getOtpEmailTemplate(otp, admin.username, 'admin password reset'));
    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.adminVerifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    if (admin.reset_otp_attempts >= 5) {
      admin.reset_otp = ''; admin.reset_otp_expiry = null;
      await admin.save();
      return res.status(400).json({ success: false, message: 'Too many attempts' });
    }
    if (admin.reset_otp !== otp || admin.reset_otp_expiry < new Date()) {
      admin.reset_otp_attempts += 1;
      await admin.save();
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
    res.json({ success: true, message: 'OTP verified', resetToken: otp });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.adminResetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    if (admin.reset_otp !== otp || admin.reset_otp_expiry < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
    admin.password = newPassword;
    admin.reset_otp = ''; admin.reset_otp_expiry = null; admin.reset_otp_attempts = 0;
    admin.password_reset_at = new Date();
    await admin.save();
    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
