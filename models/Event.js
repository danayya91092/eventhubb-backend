const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'General' },
  event_date: { type: Date, required: true },
  event_time: { type: String, default: '' },
  venue: { type: String, required: true },
  venue_address: { type: String, default: '' },
  city: { type: String, default: '' },
  ticket_price: { type: Number, default: 0 },
  total_tickets: { type: Number, default: 100 },
  available_tickets: { type: Number, default: 100 },
  banner_image: { type: String, default: '' },
  status: { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming' },
  featured: { type: Boolean, default: false },
  author_name: { type: String, default: '' },
  author_admin_id: { type: String, default: '' },
  author_role: { type: String, default: '' },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

eventSchema.index({ event_date: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ title: 'text', description: 'text', venue: 'text', city: 'text' });

module.exports = mongoose.model('Event', eventSchema);
