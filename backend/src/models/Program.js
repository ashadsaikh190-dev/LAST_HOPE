const mongoose = require('mongoose');

const programSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    degree: {
      type: String,
      required: true,
      enum: ['B.Tech', 'M.Tech', 'BBA', 'MBA', 'B.Sc', 'M.Sc', 'BCA', 'MCA', 'Diploma'],
    },
    durationYears: {
      type: Number,
      required: true,
      default: 4,
    },
    tuitionFee: {
      type: Number,
      required: true,
    },
    applicationFee: {
      type: Number,
      default: 1000,
    },
    seatCapacity: {
      type: Number,
      required: true,
      default: 120,
    },
    enrolledCount: {
      type: Number,
      default: 0,
    },
    eligibilityCriteria: {
      minTenthMarks: { type: Number, default: 50 },
      minTwelfthMarks: { type: Number, default: 60 },
      requiredSubjects: [{ type: String }],
      preferredStream: { type: String, default: 'Science' },
    },
    requiredDocumentTypes: [
      {
        type: String,
        required: true,
      },
    ],
    applicationDeadline: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Program', programSchema);
