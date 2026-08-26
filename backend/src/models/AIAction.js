const mongoose = require('mongoose');

const aiActionSchema = new mongoose.Schema(
  {
    actionId: {
      type: String,
      required: true,
      unique: true,
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
    toolName: {
      type: String,
      required: true,
      index: true,
    },
    inputParameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    executionResult: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 1.0,
    },
    executionStatus: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'REJECTED_UNAUTHORIZED', 'ESCALATED'],
      default: 'SUCCESS',
      index: true,
    },
    executedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AIAction', aiActionSchema);
