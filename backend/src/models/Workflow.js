const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    triggerEvent: {
      type: String,
      required: true, // e.g. 'DOCUMENT_UPLOADED', 'APPLICATION_SUBMITTED', 'VERIFICATION_FAILED', 'ADMISSION_APPROVED'
      index: true,
    },
    conditions: [
      {
        field: String,
        operator: {
          type: String,
          enum: ['EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'IN', 'NOT_IN'],
        },
        value: mongoose.Schema.Types.Mixed,
      },
    ],
    actions: [
      {
        actionType: {
          type: String,
          enum: [
            'DISPATCH_SQS_OCR',
            'CHECK_ELIGIBILITY',
            'SEND_EMAIL_NOTIFICATION',
            'SCHEDULE_FOLLOW_UP',
            'TRIGGER_AI_NEXT_STEP',
            'ESCALATE_TO_COUNSELOR',
            'GENERATE_ENROLLMENT',
          ],
          required: true,
        },
        parameters: mongoose.Schema.Types.Mixed,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Workflow', workflowSchema);
