const EventRequest = require('../models/EventRequest');
const { sendMail } = require('../utils/mailer');

exports.createEventRequest = async (req, res) => {
  try {
    const { name, email, phone, event_type, event_date, guest_count, budget, location, message } = req.body;
    if (!name || !email || !phone || !event_type) {
      return res.status(400).json({ success: false, message: 'Name, email, phone, and event type required' });
    }
    const request = await EventRequest.create({
      user: req.user?._id || null, name, email, phone, event_type,
      event_date: event_date || null, guest_count, budget, location, message
    });
    await sendMail(
      process.env.SMTP_FROM || 'eventhub.admin11@gmail.com', 'Admin',
      'New Event Request',
      `<p>New event request from ${name} (${email})</p><p>Type: ${event_type}</p>`
    );
    res.status(201).json({ success: true, message: 'Event request submitted', request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
