const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
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
    },
    sender: {
      type: String,
      enum: ['STUDENT', 'AI', 'COUNSELOR', 'SYSTEM'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    intent: {
      type: String,
      default: 'GENERAL_QUERY',
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 1.0,
    },
    toolCalls: [
      {
        toolName: String,
        arguments: mongoose.Schema.Types.Mixed,
        result: mongoose.Schema.Types.Mixed,
        status: { type: String, enum: ['SUCCESS', 'FAILURE'], default: 'SUCCESS' },
      },
    ],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversation: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
