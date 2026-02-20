const AuditLog = require('../models/AuditLog.model');
const logger = require('../utils/logger');

const createAuditLog = async ({
  action,
  performedBy,
  targetUser = null,
  targetResource = null,
  targetResourceId = null,
  details = {},
  ipAddress = null,
  userAgent = null,
  status = 'SUCCESS',
}) => {
  try {
    await AuditLog.create({
      action,
      performedBy,
      targetUser,
      targetResource,
      targetResourceId,
      details,
      ipAddress,
      userAgent,
      status,
    });
  } catch (err) {
    logger.error('Failed to create audit log:', err);
  }
};

const getAuditLogs = async (filters = {}, page = 1, limit = 50) => {
  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    AuditLog.find(filters)
      .populate('performedBy', 'name email role')
      .populate('targetUser', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(filters),
  ]);
  return { logs, total, pages: Math.ceil(total / limit), page };
};

module.exports = { createAuditLog, getAuditLogs };
