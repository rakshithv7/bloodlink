const User = require('../models/User.model');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt.utils');
const { createAuditLog } = require('../services/auditLog.service');
const logger = require('../utils/logger');

// @desc   Register new user
// @route  POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, bloodGroup, phone, gender, dateOfBirth, hospitalName, hospitalRegNumber } = req.body;

    // Prevent SUPER_ADMIN creation via API
    if (role === 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Cannot create SUPER_ADMIN via API' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ success: false, message: 'Email already registered' });

    const user = await User.create({
      name, email, password,
      role: role || 'USER',
      bloodGroup, phone, gender, dateOfBirth,
      hospitalName, hospitalRegNumber,
      approvalStatus: role === 'PENDING_HOSPITAL_ADMIN' ? 'PENDING' : 'NA',
      isActive: true,
    });

    await createAuditLog({
      action: 'USER_REGISTERED',
      performedBy: user._id,
      details: { email, role: user.role },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const { accessToken, refreshToken } = generateTokenPair(user);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      accessToken,
      refreshToken,
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
};

// @desc   Login
// @route  POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password +refreshToken');

    if (!user || !(await user.comparePassword(password))) {
      await createAuditLog({
        action: 'LOGIN_FAILED',
        performedBy: user?._id || '000000000000000000000000',
        details: { email },
        ipAddress: req.ip,
        status: 'FAILURE',
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const { accessToken, refreshToken } = generateTokenPair(user);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    await createAuditLog({
      action: 'USER_LOGIN',
      performedBy: user._id,
      details: { email, role: user.role },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
};

// @desc   Refresh token
// @route  POST /api/auth/refresh
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required' });

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const tokens = generateTokenPair(user);
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, ...tokens });
  } catch (err) {
    next(err);
  }
};

// @desc   Logout
// @route  POST /api/auth/logout
exports.logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc   Get current user
// @route  GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};
