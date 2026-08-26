const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: String,
      default: 'SYSTEM',
    },
    actorType: {
      type: String,
      enum: ['STUDENT', 'COUNSELOR', 'ADMIN', 'AI_AGENT', 'SYSTEM', 'WEBHOOK'],
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      sparse: true,
    },
    trackingId: {
      type: String,
      sparse: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    result: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'WARNING', 'PENDING'],
      default: 'SUCCESS',
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    requestId: {
      type: String,
      sparse: true,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ trackingId: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
