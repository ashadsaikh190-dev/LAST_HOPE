const mongoose = require('mongoose');
const { DOCUMENT_VERSION_STATUS } = require('../config/constants');

const documentVersionSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
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
    },
    versionNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    s3Key: {
      type: String,
      required: true,
    },
    s3Bucket: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(DOCUMENT_VERSION_STATUS),
      default: DOCUMENT_VERSION_STATUS.CURRENT,
      index: true,
    },
    replacementReason: {
      type: String,
      default: '',
    },
    uploadedBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

documentVersionSchema.index({ document: 1, versionNumber: 1 }, { unique: true });

module.exports = mongoose.model('DocumentVersion', documentVersionSchema);
