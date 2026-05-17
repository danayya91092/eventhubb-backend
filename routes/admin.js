const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { adminProtect, authorize } = require('../middleware/adminAuth');
const {
  getDashboardStats, getUsers, updateUserStatus, updateEmailStatus,
  getAdmins, createAdmin, updateAdmin,
  getEventRequests, updateEventRequest,
  getReports, getActivityLogs
} = require('../controllers/adminController');
const { createEventRequest } = require('../controllers/eventRequestController');

// Public
router.post('/event-requests', protect, createEventRequest);

// Admin dashboard
router.get('/dashboard', adminProtect, getDashboardStats);

// User management
router.get('/users', adminProtect, authorize('super_admin', 'booking_manager'), getUsers);
router.put('/users/:id/status', adminProtect, authorize('super_admin', 'booking_manager'), updateUserStatus);
router.put('/users/:id/email-status', adminProtect, authorize('super_admin'), updateEmailStatus);

// Admin management
router.get('/admins', adminProtect, authorize('super_admin'), getAdmins);
router.post('/admins', adminProtect, authorize('super_admin'), createAdmin);
router.put('/admins/:id', adminProtect, authorize('super_admin'), updateAdmin);

// Event requests
router.get('/event-requests', adminProtect, authorize('super_admin', 'event_manager'), getEventRequests);
router.put('/event-requests/:id', adminProtect, authorize('super_admin', 'event_manager'), updateEventRequest);

// Reports & logs
router.get('/reports', adminProtect, authorize('super_admin', 'event_manager'), getReports);
router.get('/activity-logs', adminProtect, authorize('super_admin'), getActivityLogs);

module.exports = router;
