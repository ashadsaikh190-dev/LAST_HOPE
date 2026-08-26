const mongoose = require('mongoose');
const { LIFECYCLE_STAGES } = require('../config/constants');

const studentPersonaSchema = new mongoose.Schema(
  {
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
    programInterest: {
      primaryProgram: String,
      secondaryPrograms: [String],
      department: String,
    },
    academicProfile: {
      strengthCategory: {
        type: String,
        enum: ['HIGH_ACHIEVER', 'STANDARD', 'BORDERLINE', 'AT_RISK', 'UNKNOWN'],
        default: 'UNKNOWN',
      },
      twelfthPercentage: Number,
      stream: String,
    },
    intentLevel: {
      type: String,
      enum: ['VERY_HIGH', 'HIGH', 'MODERATE', 'LOW', 'PASSIVE'],
      default: 'MODERATE',
    },
    feeConcern: {
      type: String,
      enum: ['HIGH_CONCERN', 'SCHOLARSHIP_SEEKER', 'STANDARD', 'NO_CONCERN'],
      default: 'STANDARD',
    },
    documentRisk: {
      type: String,
      enum: ['LOW', 'MODERATE', 'HIGH_RISK'],
      default: 'LOW',
    },
    engagementLevel: {
      type: String,
      enum: ['PROACTIVE', 'RESPONSIVE', 'SPORADIC', 'DISENGAGED'],
      default: 'PROACTIVE',
    },
    preferredChannel: {
      type: String,
      enum: ['WEB_CHAT', 'WHATSAPP', 'EMAIL', 'PHONE'],
      default: 'WEB_CHAT',
    },
    majorConcerns: [{ type: String }],
    currentStage: {
      type: String,
      enum: Object.values(LIFECYCLE_STAGES),
      default: LIFECYCLE_STAGES.REGISTERED,
    },
    lastInteractedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('StudentPersona', studentPersonaSchema);
