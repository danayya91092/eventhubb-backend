const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  booking_id: { type: String, unique: true },
  tickets: { type: Number, required: true, min: 1 },
  total_amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
  payment_status: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
  payment_method: { type: String, default: '' },
  special_requests: { type: String, default: '' },
  attendee_name: { type: String, default: '' },
  attendee_phone: { type: String, default: '' },
  attendee_email: { type: String, default: '' },
  booked_at: { type: Date, default: Date.now },
  confirmed_at: { type: Date, default: null },
  cancelled_at: { type: Date, default: null },
  cancel_reason: { type: String, default: '' },
  confirmed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
}, { timestamps: { createdAt: 'booked_at', updatedAt: 'updated_at' } });

bookingSchema.pre('save', function(next) {
  if (!this.booking_id) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.booking_id = `BKG${timestamp}${random}`;
  }
  next();
});

bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ event: 1, status: 1 });
bookingSchema.index({ booking_id: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
