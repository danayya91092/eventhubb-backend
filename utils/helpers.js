const crypto = require('crypto');
const speakeasy = require('speakeasy');

const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }
  return otp;
};

const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const generateTOTPSecret = () => {
  return speakeasy.generateSecret({ length: 20 }).base32;
};

const verifyTOTP = (secret, token) => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2
  });
};

const isDomainValid = (email) => {
  const invalidDomains = [
    'demo.com', 'test.com', 'example.com', 'mailinator.com',
    'guerrillamail.com', 'tempmail.com', 'throwaway.com',
    'yopmail.com', '10minutemail.com', 'sharklasers.com'
  ];
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return !invalidDomains.includes(domain);
};

const generateAdminId = (role) => {
  const prefix = role === 'super_admin' ? 'ADMIN100' : role === 'event_manager' ? 'ADMIN101'
    : role === 'booking_manager' ? 'ADMIN102' : 'ADMIN103';
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${prefix}${timestamp}`;
};

const paginate = (page = 1, limit = 10) => {
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (p - 1) * l;
  return { skip, limit: l, page: p };
};

const buildFilter = (query, fields) => {
  const filter = {};
  for (const [key, value] of Object.entries(query)) {
    if (value && fields.includes(key)) {
      if (key === 'search') {
        filter.$or = fields
          .filter(f => f !== 'search')
          .map(f => ({ [f]: { $regex: value, $options: 'i' } }));
      } else if (key === 'date_from') {
        filter.event_date = { ...filter.event_date, $gte: new Date(value) };
      } else if (key === 'date_to') {
        filter.event_date = { ...filter.event_date, $lte: new Date(value) };
      } else {
        filter[key] = value;
      }
    }
  }
  return filter;
};

module.exports = { generateOTP, generateResetToken, generateTOTPSecret, verifyTOTP, isDomainValid, generateAdminId, paginate, buildFilter };
