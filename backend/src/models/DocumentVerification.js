const mongoose = require('mongoose');
const { DOCUMENT_STATUS } = require('../config/constants');

const documentVerificationSchema = new mongoose.Schema(
  {
    documentVersion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DocumentVersion',
      required: true,
      unique: true,
      index: true,
    },
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
    verificationEngine: {
      type: String,
      enum: ['TEXTRACT', 'MANUAL_COUNSELOR', 'HYBRID_AI'],
      default: 'TEXTRACT',
    },
    status: {
      type: String,
      enum: Object.values(DOCUMENT_STATUS),
      default: DOCUMENT_STATUS.PROCESSING,
      index: true,
    },
    extractedData: {
      name: String,
      dateOfBirth: String,
      marks: Number,
      maxMarks: Number,
      percentage: Number,
      board: String,
      passingYear: Number,
      documentNumber: String,
      rawFields: mongoose.Schema.Types.Mixed,
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    mismatchDetails: [
      {
        field: String,
        applicationValue: String,
        documentValue: String,
        matchScore: Number,
        isSignificant: Boolean,
      },
    ],
    verifiedAt: {
      type: Date,
    },
    verifiedBy: {
      type: String, // 'TEXTRACT_AUTO' or counselor user ID/email
      default: 'TEXTRACT_AUTO',
    },
    counselorNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('DocumentVerification', documentVerificationSchema);
