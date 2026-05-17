const mongoose = require('mongoose');

const eventRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true },
  event_type: { type: String, required: true },
  event_date: { type: Date, default: null },
  guest_count: { type: Number, default: 0 },
  budget: { type: Number, default: 0 },
  location: { type: String, default: '' },
  message: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'contacted', 'confirmed', 'closed'], default: 'pending' },
  notes: { type: String, default: '' },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

eventRequestSchema.index({ status: 1 });
eventRequestSchema.index({ email: 1 });

module.exports = mongoose.model('EventRequest', eventRequestSchema);
