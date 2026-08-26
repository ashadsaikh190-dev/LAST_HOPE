const mongoose = require('mongoose');
const { DOCUMENT_TYPES, DOCUMENT_STATUS } = require('../config/constants');

const documentSchema = new mongoose.Schema(
  {
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
    documentType: {
      type: String,
      enum: Object.values(DOCUMENT_TYPES),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(DOCUMENT_STATUS),
      default: DOCUMENT_STATUS.NOT_UPLOADED,
      index: true,
    },
    currentVersion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DocumentVersion',
    },
    isRequired: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

documentSchema.index({ student: 1, documentType: 1 }, { unique: true });

module.exports = mongoose.model('Document', documentSchema);
