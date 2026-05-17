const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  admin_id: { type: String, unique: true },
  role: {
    type: String,
    enum: ['super_admin', 'event_manager', 'booking_manager', 'support_staff'],
    default: 'event_manager'
  },
  permissions: [{ type: String }],
  avatar: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  last_login: { type: Date, default: null },
  reset_otp: { type: String, default: '' },
  reset_otp_expiry: { type: Date, default: null },
  reset_otp_attempts: { type: Number, default: 0 },
  password_reset_at: { type: Date, default: null },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

adminSchema.pre('save', function(next) {
  if (!this.admin_id) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.admin_id = `ADMIN${timestamp}${random}`;
  }
  next();
});

adminSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

adminSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.reset_otp;
  delete obj.reset_otp_expiry;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Admin', adminSchema);
