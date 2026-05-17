const Booking = require('../models/Booking');
const Event = require('../models/Event');
const ActivityLog = require('../models/ActivityLog');
const { sendMail, getBookingConfirmationTemplate } = require('../utils/mailer');
const { generateOTP } = require('../utils/helpers');
const OTPVerification = require('../models/OTPVerification');

exports.createBooking = async (req, res) => {
  try {
    const { eventId, tickets, special_requests, attendee_name, attendee_phone } = req.body;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.status === 'cancelled') return res.status(400).json({ success: false, message: 'Event is cancelled' });
    if (event.available_tickets < tickets) return res.status(400).json({ success: false, message: 'Not enough tickets available' });
    const totalAmount = tickets * event.ticket_price;
    const booking = await Booking.create({
      user: req.user._id, event: eventId, tickets, total_amount: totalAmount,
      special_requests, attendee_name: attendee_name || req.user.fullname,
      attendee_phone: attendee_phone || req.user.phone,
      attendee_email: req.user.email, status: 'confirmed', payment_status: 'paid'
    });
    event.available_tickets -= tickets;
    event.markModified('available_tickets');
    await event.save();
    await sendMail(req.user.email, req.user.fullname, 'Booking Confirmed',
      getBookingConfirmationTemplate(req.user.fullname, event.title,
        event.event_date.toLocaleDateString(), event.venue, tickets, totalAmount, booking.booking_id));
    res.status(201).json({ success: true, message: 'Booking confirmed', booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('event', 'title event_date venue banner_image ticket_price')
      .sort({ booked_at: -1 }).lean();
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('event').populate('user', 'fullname email phone').lean();
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (req.user && booking.user._id.toString() !== req.user._id.toString() && !req.admin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id).populate('event');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (req.user && booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    booking.status = 'cancelled';
    booking.cancelled_at = new Date();
    booking.cancel_reason = reason || '';
    await booking.save();
    const event = await Event.findById(booking.event._id || booking.event);
    if (event) {
      event.available_tickets += booking.tickets;
      await event.save();
    }
    res.json({ success: true, message: 'Booking cancelled', booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin
exports.getAllBookings = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { booking_id: { $regex: search, $options: 'i' } },
        { attendee_name: { $regex: search, $options: 'i' } },
        { attendee_email: { $regex: search, $options: 'i' } }
      ];
    }
    const [bookings, total] = await Promise.all([
      Booking.find(filter).populate('event', 'title').populate('user', 'fullname email')
        .sort({ booked_at: -1 }).skip((page - 1) * limit).limit(parseInt(limit)).lean(),
      Booking.countDocuments(filter)
    ]);
    res.json({ success: true, bookings, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id).populate('event user');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    booking.status = status;
    if (status === 'confirmed') booking.confirmed_at = new Date();
    if (status === 'cancelled') {
      booking.cancelled_at = new Date();
      const event = await Event.findById(booking.event._id);
      if (event) { event.available_tickets += booking.tickets; await event.save(); }
    }
    await booking.save();
    await ActivityLog.create({ admin: req.admin._id, action: `booking_${status}`, entity_type: 'Booking', entity_id: booking._id.toString(), details: { booking_id: booking.booking_id } });
    res.json({ success: true, message: `Booking ${status}`, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBookingStats = async (req, res) => {
  try {
    const stats = await Booking.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const total = await Booking.countDocuments();
    const confirmed = await Booking.countDocuments({ status: 'confirmed' });
    const revenue = await Booking.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$total_amount' } } }
    ]);
    res.json({ success: true, stats: { total, confirmed, revenue: revenue[0]?.total || 0, byStatus: stats } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
