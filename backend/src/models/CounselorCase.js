const mongoose = require('mongoose');
const {
  COUNSELOR_CASE_PRIORITY,
  COUNSELOR_CASE_CATEGORY,
  COUNSELOR_CASE_STATUS,
} = require('../config/constants');

const counselorCaseSchema = new mongoose.Schema(
  {
    caseId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    trackingId: {
      type: String,
      required: true,
      index: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
    },
    priority: {
      type: String,
      enum: Object.values(COUNSELOR_CASE_PRIORITY),
      default: COUNSELOR_CASE_PRIORITY.MEDIUM,
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(COUNSELOR_CASE_CATEGORY),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(COUNSELOR_CASE_STATUS),
      default: COUNSELOR_CASE_STATUS.OPEN,
      index: true,
    },
    summary: {
      type: String,
      required: true,
    },
    aiReason: {
      type: String,
      required: true,
    },
    conversationSummary: {
      type: String,
      default: '',
    },
    recommendedAction: {
      type: String,
      required: true,
    },
    assignedCounselor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolutionNotes: {
      type: String,
      default: '',
    },
    resolutionDecision: {
      type: String, // 'APPROVED_EXCEPTION', 'REJECTED_REQUEST', 'DOCUMENT_VERIFIED', 'RESOLVED_QUERY', etc.
    },
    escalatedAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CounselorCase', counselorCaseSchema);
