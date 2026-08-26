const mongoose = require('mongoose');

const workflowExecutionSchema = new mongoose.Schema(
  {
    workflow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workflow',
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
    },
    trackingId: {
      type: String,
      index: true,
    },
    triggerEvent: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    actionResults: [
      {
        actionType: String,
        status: { type: String, enum: ['SUCCESS', 'FAILURE', 'SKIPPED'] },
        output: mongoose.Schema.Types.Mixed,
        executedAt: { type: Date, default: Date.now },
      },
    ],
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('WorkflowExecution', workflowExecutionSchema);
