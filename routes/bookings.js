const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { adminProtect, authorize } = require('../middleware/adminAuth');
const {
  createBooking, getUserBookings, getBooking, cancelBooking,
  getAllBookings, updateBookingStatus, getBookingStats
} = require('../controllers/bookingController');

// User routes
router.post('/', protect, createBooking);
router.get('/my', protect, getUserBookings);
router.get('/stats', getBookingStats);
router.get('/:id', protect, getBooking);
router.put('/:id/cancel', protect, cancelBooking);

// Admin routes
router.get('/', adminProtect, authorize('super_admin', 'booking_manager', 'event_manager'), getAllBookings);
router.put('/:id/status', adminProtect, authorize('super_admin', 'booking_manager'), updateBookingStatus);

module.exports = router;
