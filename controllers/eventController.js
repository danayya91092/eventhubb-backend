const Event = require('../models/Event');
const Booking = require('../models/Booking');
const ActivityLog = require('../models/ActivityLog');
const { paginate, buildFilter } = require('../utils/helpers');

exports.getEvents = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    const filter = buildFilter(req.query, ['status', 'category', 'city', 'search', 'featured', 'author_admin_id']);
    filter.status = filter.status || 'upcoming';
    const [events, total] = await Promise.all([
      Event.find(filter).sort({ event_date: 1 }).skip(skip).limit(limit).lean(),
      Event.countDocuments(filter)
    ]);
    res.json({ success: true, events, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.admin) {
      data.author_name = req.admin.username;
      data.author_admin_id = req.admin.admin_id;
      data.author_role = req.admin.role;
      data.created_by = req.admin._id;
    }
    if (data.total_tickets) data.available_tickets = data.total_tickets;
    if (req.file) data.banner_image = req.file.filename;
    const event = await Event.create(data);
    await ActivityLog.create({ admin: req.admin?._id, action: 'create_event', entity_type: 'Event', entity_id: event._id.toString(), details: { title: event.title } });
    res.status(201).json({ success: true, message: 'Event created', event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (req.admin && req.admin.role !== 'super_admin' && event.created_by?.toString() !== req.admin._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only edit your own events' });
    }
    Object.assign(event, req.body);
    if (req.file) event.banner_image = req.file.filename;
    if (req.body.total_tickets && !req.body.available_tickets) {
      const soldTickets = event.total_tickets - event.available_tickets;
      event.available_tickets = parseInt(req.body.total_tickets) - soldTickets;
    }
    await event.save();
    await ActivityLog.create({ admin: req.admin?._id, action: 'update_event', entity_type: 'Event', entity_id: event._id.toString(), details: { title: event.title } });
    res.json({ success: true, message: 'Event updated', event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (req.admin.role !== 'super_admin' && event.created_by?.toString() !== req.admin._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only delete your own events' });
    }
    await Event.findByIdAndDelete(req.params.id);
    await ActivityLog.create({ admin: req.admin._id, action: 'delete_event', entity_type: 'Event', entity_id: req.params.id, details: { title: event.title } });
    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getEventStats = async (req, res) => {
  try {
    const stats = await Event.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const total = await Event.countDocuments();
    const upcoming = await Event.countDocuments({ status: 'upcoming' });
    const completed = await Event.countDocuments({ status: 'completed' });
    res.json({ success: true, stats: { total, upcoming, completed, byStatus: stats } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
