const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    trackingId: {
      type: String,
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    source: {
      type: String,
      enum: ['WEBSITE_FORM', 'AI_CHAT', 'EMAIL', 'WHATSAPP', 'SOCIAL_CHANNELS', 'DIRECT'],
      default: 'WEBSITE_FORM',
    },
    interestedProgram: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
    },
    status: {
      type: String,
      enum: ['NEW', 'CONTACTED', 'ENGAGED', 'CONVERTED', 'LOST'],
      default: 'NEW',
    },
    notes: [
      {
        content: String,
        addedBy: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

leadSchema.index({ email: 1, source: 1 });

module.exports = mongoose.model('Lead', leadSchema);
