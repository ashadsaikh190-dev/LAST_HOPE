const mongoose = require('mongoose');
const { ERROR_CATEGORIES } = require('../config/constants');

const systemErrorSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: Object.values(ERROR_CATEGORIES),
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    stack: {
      type: String,
    },
    endpoint: {
      type: String,
    },
    httpMethod: {
      type: String,
    },
    studentTrackingId: {
      type: String,
      sparse: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isResolved: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SystemError', systemErrorSchema);
