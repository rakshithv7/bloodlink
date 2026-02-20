const { verifyAccessToken } = require('../utils/jwt.utils');
const User = require('../models/User.model');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (tokenErr) {
      return res.status(401).json({ success: false, message: 'Token expired or invalid. Please login again.' });
    }

    const user = await User.findById(decoded.id).select('-password -refreshToken');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    req.user = user;
    next();
  } catch (err) {
    logger.warn('Auth middleware error:', err.message);
    return res.status(401).json({ success: false, message: 'Authentication failed' });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
      });
    }
    next();
  };
};

const requireApproved = (req, res, next) => {
  if (
    req.user.approvalStatus !== 'APPROVED' &&
    req.user.role !== 'USER' &&
    req.user.role !== 'SUPER_ADMIN'
  ) {
    return res.status(403).json({ success: false, message: 'Account pending approval' });
  }
  next();
};

module.exports = { authenticate, authorize, requireApproved };