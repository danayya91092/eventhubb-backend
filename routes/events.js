const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { adminProtect, authorize } = require('../middleware/adminAuth');
const { getEvents, getEvent, createEvent, updateEvent, deleteEvent, getEventStats } = require('../controllers/eventController');

router.get('/', getEvents);
router.get('/stats', getEventStats);
router.get('/:id', getEvent);
router.post('/', adminProtect, authorize('super_admin', 'event_manager'), createEvent);
router.put('/:id', adminProtect, authorize('super_admin', 'event_manager'), updateEvent);
router.delete('/:id', adminProtect, authorize('super_admin', 'event_manager'), deleteEvent);

module.exports = router;
