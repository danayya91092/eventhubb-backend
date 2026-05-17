const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  action: { type: String, required: true },
  entity_type: { type: String, default: '' },
  entity_id: { type: String, default: '' },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip_address: { type: String, default: '' },
  user_agent: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'created_at' } });

activityLogSchema.index({ admin: 1, created_at: -1 });
activityLogSchema.index({ user: 1, created_at: -1 });
activityLogSchema.index({ action: 1 });
activityLogSchema.index({ created_at: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
