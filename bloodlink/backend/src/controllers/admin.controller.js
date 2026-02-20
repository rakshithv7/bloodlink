const User = require('../models/User.model');
const BloodDonation = require('../models/BloodDonation.model');
const BloodRequest = require('../models/BloodRequest.model');
const AuditLog = require('../models/AuditLog.model');
const { createAuditLog, getAuditLogs } = require('../services/auditLog.service');
const { getIO } = require('../sockets');

// @desc   Get all pending hospital admins
// @route  GET /api/admin/pending-hospitals
exports.getPendingHospitals = async (req, res, next) => {
  try {
    const hospitals = await User.find({ role: 'PENDING_HOSPITAL_ADMIN', approvalStatus: 'PENDING' })
      .sort({ createdAt: -1 });
    res.json({ success: true, data: hospitals });
  } catch (err) { next(err); }
};

// @desc   Approve or reject hospital admin
// @route  PATCH /api/admin/hospitals/:id/approval
exports.approveHospital = async (req, res, next) => {
  try {
    const { action, reason } = req.body; // action: 'APPROVE' | 'REJECT'
    const hospital = await User.findById(req.params.id);

    if (!hospital || hospital.role !== 'PENDING_HOSPITAL_ADMIN') {
      return res.status(404).json({ success: false, message: 'Pending hospital not found' });
    }

    if (action === 'APPROVE') {
      hospital.role = 'HOSPITAL_ADMIN';
      hospital.approvalStatus = 'APPROVED';
      hospital.approvedBy = req.user._id;
      hospital.approvedAt = new Date();
    } else if (action === 'REJECT') {
      hospital.approvalStatus = 'REJECTED';
      hospital.isActive = false;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    await hospital.save();

    await createAuditLog({
      action: `HOSPITAL_${action}D`,
      performedBy: req.user._id,
      targetUser: hospital._id,
      details: { hospitalName: hospital.hospitalName, reason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Real-time notification
    const io = getIO();
    if (io) io.to('super-admin').emit('hospital_approval_updated', { hospital, action });

    res.json({ success: true, message: `Hospital ${action.toLowerCase()}d`, data: hospital });
  } catch (err) { next(err); }
};

// @desc   Get all pending managers (for hospital admin)
// @route  GET /api/admin/pending-managers
exports.getPendingManagers = async (req, res, next) => {
  try {
    const query = { role: 'PENDING_MANAGER', approvalStatus: 'PENDING' };
    const managers = await User.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: managers });
  } catch (err) { next(err); }
};

// @desc   Approve or reject manager
// @route  PATCH /api/admin/managers/:id/approval
exports.approveManager = async (req, res, next) => {
  try {
    const { action } = req.body;
    const manager = await User.findById(req.params.id);

    if (!manager || manager.role !== 'PENDING_MANAGER') {
      return res.status(404).json({ success: false, message: 'Pending manager not found' });
    }

    if (action === 'APPROVE') {
      manager.role = 'MANAGER';
      manager.approvalStatus = 'APPROVED';
      manager.approvedBy = req.user._id;
      manager.approvedAt = new Date();
    } else if (action === 'REJECT') {
      manager.approvalStatus = 'REJECTED';
      manager.isActive = false;
    }

    await manager.save();

    await createAuditLog({
      action: `MANAGER_${action}D`,
      performedBy: req.user._id,
      targetUser: manager._id,
      details: {},
      ipAddress: req.ip,
    });

    res.json({ success: true, message: `Manager ${action.toLowerCase()}d`, data: manager });
  } catch (err) { next(err); }
};

// @desc   System analytics dashboard
// @route  GET /api/admin/analytics
exports.getAnalytics = async (req, res, next) => {
  try {
    const [
      totalDonors,
      totalHospitals,
      pendingHospitals,
      totalDonations,
      pendingDonations,
      totalRequests,
      openRequests,
      criticalRequests,
      expiringDonations,
      bloodGroupStats,
    ] = await Promise.all([
      User.countDocuments({ role: 'USER', isActive: true }),
      User.countDocuments({ role: 'HOSPITAL_ADMIN', approvalStatus: 'APPROVED' }),
      User.countDocuments({ role: 'PENDING_HOSPITAL_ADMIN', approvalStatus: 'PENDING' }),
      BloodDonation.countDocuments(),
      BloodDonation.countDocuments({ status: 'PENDING' }),
      BloodRequest.countDocuments(),
      BloodRequest.countDocuments({ status: 'OPEN' }),
      BloodRequest.countDocuments({ status: 'OPEN', urgency: 'Critical' }),
      BloodDonation.countDocuments({
        status: 'APPROVED',
        expiryDate: { $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
        isExpired: false,
      }),
      BloodDonation.aggregate([
        { $match: { status: 'APPROVED', isExpired: false } },
        { $group: { _id: '$bloodGroup', count: { $sum: '$units' } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalDonors,
        totalHospitals,
        pendingHospitals,
        totalDonations,
        pendingDonations,
        totalRequests,
        openRequests,
        criticalRequests,
        expiringDonations,
        bloodGroupStats,
      },
    });
  } catch (err) { next(err); }
};

// @desc   Get audit logs
// @route  GET /api/admin/audit-logs
exports.getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, performedBy } = req.query;
    const filters = {};
    if (action) filters.action = action;
    if (performedBy) filters.performedBy = performedBy;

    const result = await getAuditLogs(filters, parseInt(page), parseInt(limit));
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

// @desc   Get all users
// @route  GET /api/admin/users
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, page = 1, limit = 20, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      User.countDocuments(query),
    ]);

    res.json({ success: true, data: users, total, pages: Math.ceil(total / parseInt(limit)), page: parseInt(page) });
  } catch (err) { next(err); }
};

// @desc   Toggle user active status
// @route  PATCH /api/admin/users/:id/toggle-status
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'SUPER_ADMIN') return res.status(403).json({ success: false, message: 'Cannot modify SUPER_ADMIN' });

    user.isActive = !user.isActive;
    await user.save();

    await createAuditLog({
      action: user.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      performedBy: req.user._id,
      targetUser: user._id,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, data: user });
  } catch (err) { next(err); }
};
