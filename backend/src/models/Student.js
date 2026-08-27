const mongoose = require('mongoose');
const { LIFECYCLE_STAGES } = require('../config/constants');

const studentSchema = new mongoose.Schema(
  {
    trackingId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY', ''],
      default: '',
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: 'India' },
      pincode: { type: String, default: '' },
    },
    academicProfile: {
      tenthMarks: { type: Number, min: 0, max: 100 },
      tenthBoard: { type: String, default: '' },
      tenthPassingYear: { type: Number },
      twelfthMarks: { type: Number, min: 0, max: 100 },
      twelfthBoard: { type: String, default: '' },
      twelfthPassingYear: { type: Number },
      twelfthStream: { type: String, default: '' },
      subjects: [{ name: String, score: Number, maxScore: Number }],
    },
    currentStage: {
      type: String,
      enum: Object.values(LIFECYCLE_STAGES),
      default: LIFECYCLE_STAGES.REGISTERED,
      required: true,
      index: true,
    },
    selectedProgram: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
    },
    currentApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
    },
    officialEnrollmentNumber: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },
    persona: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentPersona',
    },
    isSpecialFeeWaiverRequested: {
      type: Boolean,
      default: false,
    },
    isSpecialAccommodationRequested: {
      type: Boolean,
      default: false,
    },
    assignedCounselor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    lastCounselorInteractionAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

studentSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

module.exports = mongoose.model('Student', studentSchema);
