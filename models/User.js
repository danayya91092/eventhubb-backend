const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullname: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: '' },
  password: { type: String, required: true },
  user_id: { type: String, unique: true },
  account_status: { type: String, enum: ['active', 'suspended', 'banned'], default: 'active' },
  email_status: { type: String, enum: ['verified', 'unverified', 'invalid'], default: 'unverified' },
  suspended_reason: { type: String, default: '' },
  verified_at: { type: Date, default: null },
  password_reset_at: { type: Date, default: null },
  reset_otp: { type: String, default: '' },
  reset_otp_expiry: { type: Date, default: null },
  reset_otp_attempts: { type: Number, default: 0 },
  failed_login_attempts: { type: Number, default: 0 },
  locked_until: { type: Date, default: null },
  last_login: { type: Date, default: null },
  last_login_ip: { type: String, default: '' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.pre('save', function(next) {
  if (!this.user_id) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.user_id = `USR${timestamp}${random}`;
  }
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.reset_otp;
  delete obj.reset_otp_expiry;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
