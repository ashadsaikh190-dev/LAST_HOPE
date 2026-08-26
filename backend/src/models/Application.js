const mongoose = require('mongoose');
const { LIFECYCLE_STAGES } = require('../config/constants');

const applicationSchema = new mongoose.Schema(
  {
    applicationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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
    academicYear: {
      type: String,
      default: '2026-2027',
    },
    personalDetails: {
      fullName: { type: String, required: true },
      dateOfBirth: { type: Date, required: true },
      gender: { type: String, required: true },
      nationality: { type: String, default: 'Indian' },
      fatherName: { type: String, default: '' },
      motherName: { type: String, default: '' },
      phone: { type: String, required: true },
      email: { type: String, required: true },
      address: {
        street: String,
        city: String,
        state: String,
        country: { type: String, default: 'India' },
        pincode: String,
      },
    },
    academicDetails: {
      tenthBoard: { type: String, required: true },
      tenthPercentage: { type: Number, required: true, min: 0, max: 100 },
      tenthPassingYear: { type: Number, required: true },
      twelfthBoard: { type: String, required: true },
      twelfthPercentage: { type: Number, required: true, min: 0, max: 100 },
      twelfthPassingYear: { type: Number, required: true },
      twelfthStream: { type: String, required: true },
      physicsMarks: { type: Number },
      chemistryMarks: { type: Number },
      mathMarks: { type: Number },
    },
    status: {
      type: String,
      enum: Object.values(LIFECYCLE_STAGES),
      default: LIFECYCLE_STAGES.APPLICATION_STARTED,
      index: true,
    },
    submissionDate: {
      type: Date,
    },
    isPaymentRequired: {
      type: Boolean,
      default: true,
    },
    isPaymentCompleted: {
      type: Boolean,
      default: false,
    },
    isFeeWaiverApproved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Application', applicationSchema);
