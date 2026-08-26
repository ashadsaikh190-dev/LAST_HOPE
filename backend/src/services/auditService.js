const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');

const logAudit = async ({
  actorId = 'SYSTEM',
  actorType = 'SYSTEM',
  studentId = null,
  trackingId = null,
  action,
  result = 'SUCCESS',
  metadata = {},
  requestId = null,
  ipAddress = '',
  userAgent = '',
}) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      // Database not connected; skip DB write to avoid buffering timeout
      return null;
    }
    const log = await AuditLog.create({
      actorId: String(actorId),
      actorType,
      student: studentId,
      trackingId,
      action,
      result,
      metadata,
      requestId,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });
    return log;
  } catch (error) {
    console.error(`[AuditLog Error] Failed to record audit log: ${error.message}`);
    return null;
  }
};

module.exports = {
  logAudit,
};
