const mongoose = require('mongoose');
const { ELIGIBILITY_STATUS } = require('../config/constants');

const eligibilityResultSchema = new mongoose.Schema(
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
    program: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ELIGIBILITY_STATUS),
      default: ELIGIBILITY_STATUS.PENDING,
      required: true,
      index: true,
    },
    evaluations: [
      {
        criterion: String,
        requiredValue: String,
        actualValue: String,
        isPassed: Boolean,
        remarks: String,
      },
    ],
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    counselorOverride: {
      isOverridden: { type: Boolean, default: false },
      overriddenBy: String,
      reason: String,
      overrideDate: Date,
    },
    checkedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('EligibilityResult', eligibilityResultSchema);
