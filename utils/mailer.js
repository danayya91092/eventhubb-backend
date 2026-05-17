const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const sendMail = async (to, toName, subject, body) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Eventhubb'}" <${process.env.SMTP_FROM}>`,
      to: `"${toName}" <${to}>`,
      subject,
      html: body
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error.message);
    return { success: false, message: error.message };
  }
};

const getOtpEmailTemplate = (otp, name, purpose) => `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
  <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 12px; padding: 30px;">
    <h2 style="color: #0f172a; text-align: center;">Eventhubb</h2>
    <p style="color: #475569;">Hi ${name},</p>
    <p style="color: #475569;">Your OTP for ${purpose} is:</p>
    <div style="text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: 700; color: #d4a845; padding: 20px; background: #f8fafc; border-radius: 8px; margin: 20px 0;">${otp}</div>
    <p style="color: #94a3b8; font-size: 12px;">This OTP expires in 10 minutes. Do not share it.</p>
  </div>
</body></html>`;

const getSuspensionEmailTemplate = (name, reason) => `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
  <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 12px; padding: 30px;">
    <h2 style="color: #dc2626;">Account Suspended</h2>
    <p>Hi ${name},</p>
    <p>Your Eventhubb account has been suspended.</p>
    ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
    <p>Contact support for more information.</p>
  </div>
</body></html>`;

const getReactivatedEmailTemplate = (name) => `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
  <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 12px; padding: 30px;">
    <h2 style="color: #22c55e;">Account Reactivated</h2>
    <p>Hi ${name},</p>
    <p>Your Eventhubb account has been reactivated. You can now log in and use all features.</p>
  </div>
</body></html>`;

const getBookingConfirmationTemplate = (name, eventTitle, date, venue, tickets, amount, bookingId) => `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
  <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 12px; padding: 30px;">
    <h2 style="color: #22c55e; text-align: center;">Booking Confirmed!</h2>
    <p>Hi ${name},</p>
    <p>Your booking has been confirmed.</p>
    <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p><strong>Event:</strong> ${eventTitle}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Venue:</strong> ${venue}</p>
      <p><strong>Tickets:</strong> ${tickets}</p>
      <p><strong>Amount:</strong> ₹${amount}</p>
      <p><strong>Booking ID:</strong> ${bookingId}</p>
    </div>
  </div>
</body></html>`;

module.exports = { sendMail, getOtpEmailTemplate, getSuspensionEmailTemplate, getReactivatedEmailTemplate, getBookingConfirmationTemplate };
