const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema(
  {
    enrollmentNumber: {
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
      unique: true,
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
      required: true,
      unique: true,
    },
    program: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
      default: '2026-2027',
    },
    status: {
      type: String,
      enum: ['ACTIVE_ENROLLED', 'PROVISIONAL', 'CANCELLED', 'GRADUATED'],
      default: 'ACTIVE_ENROLLED',
      index: true,
    },
    rollNumber: {
      type: String,
      sparse: true,
    },
    batch: {
      type: String,
      default: '2026-2030',
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    generatedBy: {
      type: String,
      default: 'AUTONOMOUS_ENROLLMENT_SERVICE',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Enrollment', enrollmentSchema);
