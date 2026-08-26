const mongoose = require('mongoose');
const { COST_PROTECTION_LEVELS } = require('../config/constants');
const config = require('../config/env');

const costProtectionStateSchema = new mongoose.Schema(
  {
    singletonId: {
      type: String,
      default: 'GLOBAL_AWS_COST_PROTECTION_STATE',
      unique: true,
      index: true,
    },
    currentLevel: {
      type: String,
      enum: Object.values(COST_PROTECTION_LEVELS),
      default: COST_PROTECTION_LEVELS.NORMAL,
      index: true,
    },
    previousLevel: {
      type: String,
      enum: Object.values(COST_PROTECTION_LEVELS),
      default: COST_PROTECTION_LEVELS.NORMAL,
    },
    estimatedCost: {
      type: Number,
      default: 0.0,
    },
    isSimulated: {
      type: Boolean,
      default: false,
    },
    simulatedCost: {
      type: Number,
      default: 0.0,
    },
    isBillingDataAvailable: {
      type: Boolean,
      default: false,
    },
    billingDataSource: {
      type: String,
      default: 'UNINITIALIZED', // 'CLOUDWATCH_BILLING', 'SIMULATED', 'BILLING_DATA_TEMPORARILY_UNAVAILABLE'
    },
    lastCostCheck: {
      type: Date,
      default: Date.now,
    },
    lastProtectionEvent: {
      type: String,
      default: 'SYSTEM_INITIALIZED',
    },
    lastProtectionEventAt: {
      type: Date,
      default: Date.now,
    },
    consecutiveMonitoringFailures: {
      type: Number,
      default: 0,
    },
    isConservativeMode: {
      type: Boolean,
      default: false,
    },
    // Service-level circuit breaker statuses
    services: {
      textract: {
        enabled: { type: Boolean, default: true },
        blockedReason: { type: String, default: '' },
        pausedAt: { type: Date, default: null },
      },
      ses: {
        enabled: { type: Boolean, default: true },
        blockedReason: { type: String, default: '' },
        pausedAt: { type: Date, default: null },
      },
      sqs: {
        enabled: { type: Boolean, default: true },
        blockedReason: { type: String, default: '' },
        pausedAt: { type: Date, default: null },
      },
      scheduledJobs: {
        enabled: { type: Boolean, default: true },
        blockedReason: { type: String, default: '' },
        pausedAt: { type: Date, default: null },
      },
      ec2: {
        enabled: { type: Boolean, default: true },
        status: { type: String, default: 'RUNNING' }, // 'RUNNING', 'STOPPED', 'NOT_APPLICABLE'
        instanceId: { type: String, default: '' },
        stoppedAt: { type: Date, default: null },
      },
      aiProcessing: {
        enabled: { type: Boolean, default: true },
        blockedReason: { type: String, default: '' },
      },
    },
    // Application Usage Limits & Real-Time Counters (Defense Layer 2)
    usageCounters: {
      textractCalls: { type: Number, default: 0 },
      emailsSent: { type: Number, default: 0 },
      sqsMessages: { type: Number, default: 0 },
      lambdaOperations: { type: Number, default: 0 },
      totalAwsOperations: { type: Number, default: 0 },
    },
    thresholds: {
      budgetLimit: { type: Number, default: () => config.AWS_CREDIT_LIMIT || 96.87 },
      targetLimit: { type: Number, default: () => config.AWS_TARGET_LIMIT || 50.0 },
      warning: { type: Number, default: () => config.AWS_WARNING_THRESHOLD || 30.0 },
      critical: { type: Number, default: () => config.AWS_CRITICAL_THRESHOLD || 40.0 },
      emergency: { type: Number, default: () => config.AWS_EMERGENCY_THRESHOLD || 50.0 },
      hardProtection: { type: Number, default: () => config.AWS_HARD_PROTECTION_THRESHOLD || 60.0 },
    },
    applicationLimits: {
      maxTextractDocuments: { type: Number, default: () => config.MAX_TEXTRACT_DOCUMENTS },
      maxEmails: { type: Number, default: () => config.MAX_EMAILS },
      maxAwsOperations: { type: Number, default: () => config.MAX_AWS_OPERATIONS },
      maxSqsMessages: { type: Number, default: () => config.MAX_SQS_MESSAGES },
      maxLambdaOperations: { type: Number, default: () => config.MAX_LAMBDA_OPERATIONS },
      maxRetries: { type: Number, default: () => config.MAX_RETRIES },
    },
    adminOverride: {
      isResumed: { type: Boolean, default: false },
      resumedAt: { type: Date, default: null },
      resumedBy: { type: String, default: null },
      notes: { type: String, default: '' },
    },
    history: [
      {
        timestamp: { type: Date, default: Date.now },
        level: { type: String },
        cost: { type: Number },
        event: { type: String },
        reason: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CostProtectionState', costProtectionStateSchema);
