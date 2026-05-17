const User = require('../models/User');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const EventRequest = require('../models/EventRequest');
const ActivityLog = require('../models/ActivityLog');
const Admin = require('../models/Admin');
const { sendMail, getSuspensionEmailTemplate, getReactivatedEmailTemplate } = require('../utils/mailer');
const { paginate } = require('../utils/helpers');

exports.getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalEvents, totalBookings, totalRevenue, pendingRequests, bookingStats] = await Promise.all([
      User.countDocuments(),
      Event.countDocuments(),
      Booking.countDocuments(),
      Booking.aggregate([{ $match: { status: 'confirmed' } }, { $group: { _id: null, total: { $sum: '$total_amount' } } }]),
      EventRequest.countDocuments({ status: 'pending' }),
      Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
    ]);
    const [recentBookings, upcomingEvents] = await Promise.all([
      Booking.find().populate('event', 'title').populate('user', 'fullname email').sort({ booked_at: -1 }).limit(5).lean(),
      Event.find({ status: 'upcoming', event_date: { $gte: new Date() } }).sort({ event_date: 1 }).limit(5).lean()
    ]);
    res.json({
      success: true,
      stats: {
        totalUsers, totalEvents, totalBookings,
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingRequests, bookingStats
      },
      recentBookings, upcomingEvents
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    const filter = {};
    if (req.query.status) filter.account_status = req.query.status;
    if (req.query.email_status) filter.email_status = req.query.email_status;
    if (req.query.search) {
      filter.$or = [
        { fullname: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { user_id: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    const [users, total] = await Promise.all([
      User.find(filter).select('-password -reset_otp -reset_otp_expiry').sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter)
    ]);
    res.json({ success: true, users, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.account_status = status;
    if (status === 'suspended') user.suspended_reason = reason || '';
    else user.suspended_reason = '';
    await user.save();
    if (status === 'suspended') await sendMail(user.email, user.fullname, 'Account Suspended', getSuspensionEmailTemplate(user.fullname, reason));
    else if (status === 'active') await sendMail(user.email, user.fullname, 'Account Reactivated', getReactivatedEmailTemplate(user.fullname));
    await ActivityLog.create({ admin: req.admin._id, action: `user_${status}`, entity_type: 'User', entity_id: user._id.toString(), details: { user_id: user.user_id, reason } });
    res.json({ success: true, message: `User ${status}`, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateEmailStatus = async (req, res) => {
  try {
    const { email_status } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { email_status }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await ActivityLog.create({ admin: req.admin._id, action: `email_${email_status}`, entity_type: 'User', entity_id: user._id.toString(), details: { email: user.email } });
    res.json({ success: true, message: `Email marked as ${email_status}`, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select('-password -reset_otp -reset_otp_expiry').sort({ created_at: -1 }).lean();
    res.json({ success: true, admins });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (req.admin.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Only Super Admin can create admins' });
    const existing = await Admin.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (existing) return res.status(400).json({ success: false, message: 'Username or email already exists' });
    const permissions = role === 'super_admin' ? ['all']
      : role === 'event_manager' ? ['manage_events', 'view_bookings', 'view_reports']
        : role === 'booking_manager' ? ['manage_bookings', 'view_events', 'manage_users', 'manage_user_status']
          : ['view_events', 'view_bookings'];
    const admin = await Admin.create({ username, email, password, role, permissions, created_by: req.admin._id });
    await ActivityLog.create({ admin: req.admin._id, action: 'create_admin', entity_type: 'Admin', entity_id: admin._id.toString(), details: { username, role } });
    res.status(201).json({ success: true, message: 'Admin created', admin: admin.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateAdmin = async (req, res) => {
  try {
    if (req.admin.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Not authorized' });
    const { role, status, permissions } = req.body;
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    if (role) admin.role = role;
    if (status) admin.status = status;
    if (permissions) admin.permissions = permissions;
    await admin.save();
    res.json({ success: true, message: 'Admin updated', admin: admin.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getEventRequests = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const [requests, total] = await Promise.all([
      EventRequest.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
      EventRequest.countDocuments(filter)
    ]);
    res.json({ success: true, requests, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateEventRequest = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const request = await EventRequest.findByIdAndUpdate(req.params.id, { status, notes }, { new: true });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    res.json({ success: true, message: 'Request updated', request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getReports = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    let dateGroup;
    if (period === 'daily') dateGroup = { $dateToString: { format: '%Y-%m-%d', date: '$booked_at' } };
    else if (period === 'yearly') dateGroup = { $dateToString: { format: '%Y', date: '$booked_at' } };
    else dateGroup = { $dateToString: { format: '%Y-%m', date: '$booked_at' } };

    const [revenueByPeriod, bookingsByCategory, topEvents, userGrowth] = await Promise.all([
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: dateGroup, revenue: { $sum: '$total_amount' }, count: { $sum: 1 } } },
        { $sort: { _id: -1 } }, { $limit: 12 }
      ]),
      Booking.aggregate([
        { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'event' } },
        { $unwind: { path: '$event', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$event.category', count: { $sum: 1 }, revenue: { $sum: '$total_amount' } } },
        { $sort: { count: -1 } }
      ]),
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: '$event', count: { $sum: 1 }, revenue: { $sum: '$total_amount' } } },
        { $sort: { count: -1 } }, { $limit: 10 },
        { $lookup: { from: 'events', localField: '_id', foreignField: '_id', as: 'event' } },
        { $unwind: { path: '$event', preserveNullAndEmptyArrays: true } }
      ]),
      User.aggregate([
        { $group: { _id: dateGroup, count: { $sum: 1 } } },
        { $sort: { _id: -1 } }, { $limit: 12 }
      ])
    ]);
    res.json({ success: true, reports: { revenueByPeriod, bookingsByCategory, topEvents, userGrowth } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const logs = await ActivityLog.find()
      .populate('admin', 'username email')
      .populate('user', 'fullname email')
      .sort({ created_at: -1 }).skip((page - 1) * limit).limit(parseInt(limit)).lean();
    const total = await ActivityLog.countDocuments();
    res.json({ success: true, logs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
