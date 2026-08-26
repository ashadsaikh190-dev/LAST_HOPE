const mongoose = require('mongoose');
const { ADMISSION_STATUS } = require('../config/constants');

const admissionSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
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
    program: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ADMISSION_STATUS),
      default: ADMISSION_STATUS.PENDING_REVIEW,
      required: true,
      index: true,
    },
    offerDate: {
      type: Date,
      default: Date.now,
    },
    acceptanceDeadline: {
      type: Date,
    },
    scholarshipPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    decisionNotes: {
      type: String,
      default: '',
    },
    decisionBy: {
      type: String, // 'AUTONOMOUS_ADMISSION_ENGINE' or Counselor/Admin email
      default: 'AUTONOMOUS_ADMISSION_ENGINE',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Admission', admissionSchema);
