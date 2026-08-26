const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
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
    channel: {
      type: String,
      enum: ['WEB_CHAT', 'WHATSAPP', 'EMAIL', 'COUNSELOR_PORTAL'],
      default: 'WEB_CHAT',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ESCALATED', 'RESOLVED', 'CLOSED'],
      default: 'ACTIVE',
      index: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    summary: {
      type: String,
      default: '',
    },
    sentiment: {
      type: String,
      enum: ['POSITIVE', 'NEUTRAL', 'ANXIOUS', 'FRUSTRATED', 'CONFUSED'],
      default: 'NEUTRAL',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Conversation', conversationSchema);
