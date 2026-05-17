const mongoose = require('mongoose');

const otpVerificationSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  otp: { type: String, required: true },
  type: {
    type: String,
    enum: ['email_verification', 'password_reset', 'admin_reset', 'booking_confirmation'],
    default: 'email_verification'
  },
  attempts: { type: Number, default: 0 },
  max_attempts: { type: Number, default: 5 },
  resend_count: { type: Number, default: 0 },
  max_resends: { type: Number, default: 3 },
  expires_at: { type: Date, required: true },
  verified_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'created_at' } });

otpVerificationSchema.index({ email: 1, type: 1 });
otpVerificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTPVerification', otpVerificationSchema);
