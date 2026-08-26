const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema(
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
    triggerType: {
      type: String,
      enum: [
        'MISSING_DOCUMENTS',
        'INACTIVE_STUDENT',
        'PAYMENT_PENDING',
        'APPLICATION_INCOMPLETE',
        'DOCUMENT_CORRECTION_REMINDER',
        'OFFER_EXPIRY_REMINDER',
        'CUSTOM',
      ],
      required: true,
    },
    scheduledFor: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'EXECUTED', 'CANCELLED', 'FAILED'],
      default: 'SCHEDULED',
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    channel: {
      type: String,
      enum: ['EMAIL', 'WHATSAPP', 'IN_APP'],
      default: 'EMAIL',
    },
    executedAt: {
      type: Date,
    },
    resultNotes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('FollowUp', followUpSchema);
