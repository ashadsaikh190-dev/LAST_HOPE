const { GetMetricStatisticsCommand } = require('@aws-sdk/client-cloudwatch');
const { cloudWatchClient, isAwsConfigured } = require('../config/aws');
const config = require('../config/env');
const { COST_PROTECTION_LEVELS, COST_PROTECTION_EVENTS } = require('../config/constants');
const CostProtectionState = require('../models/CostProtectionState');
const { logAudit } = require('./auditService');
const { emitToCounselors } = require('../config/socket');

// In-memory cache & active timer
let monitoringTimer = null;
let currentIntervalMs = config.AWS_COST_CHECK_INTERVAL_MS || 60000;

class AwsCostProtectionError extends Error {
  constructor(message = "AWS cost protection is currently active. This operation has temporarily been paused to protect the institution's AWS budget.", serviceName = 'AWS_SERVICE') {
    super(message);
    this.name = 'AwsCostProtectionError';
    this.serviceName = serviceName;
    this.statusCode = 429;
    this.code = 'AWS_COST_PROTECTION_ACTIVE';
  }
}

/**
 * Initializes or retrieves the singleton CostProtectionState document
 */
const getCostProtectionState = async () => {
  let state = await CostProtectionState.findOne({ singletonId: 'GLOBAL_AWS_COST_PROTECTION_STATE' });
  if (!state) {
    state = await CostProtectionState.create({
      singletonId: 'GLOBAL_AWS_COST_PROTECTION_STATE',
      currentLevel: COST_PROTECTION_LEVELS.NORMAL,
      previousLevel: COST_PROTECTION_LEVELS.NORMAL,
      estimatedCost: config.AWS_SIMULATED_COST || 0.0,
      isSimulated: config.AWS_COST_PROTECTION_TEST_MODE || false,
      simulatedCost: config.AWS_SIMULATED_COST || 0.0,
      isBillingDataAvailable: config.AWS_COST_PROTECTION_TEST_MODE ? true : false,
      billingDataSource: config.AWS_COST_PROTECTION_TEST_MODE ? 'SIMULATED' : 'BILLING_DATA_TEMPORARILY_UNAVAILABLE',
      thresholds: {
        budgetLimit: config.AWS_BUDGET_LIMIT,
        warning: config.AWS_WARNING_THRESHOLD,
        critical: config.AWS_CRITICAL_THRESHOLD,
        emergency: config.AWS_EMERGENCY_THRESHOLD,
      },
      applicationLimits: {
        maxTextractDocuments: config.MAX_TEXTRACT_DOCUMENTS,
        maxEmails: config.MAX_EMAILS,
        maxAwsOperations: config.MAX_AWS_OPERATIONS,
        maxSqsMessages: config.MAX_SQS_MESSAGES,
        maxLambdaOperations: config.MAX_LAMBDA_OPERATIONS,
        maxRetries: config.MAX_RETRIES,
      },
    });
  }
  return state;
};

/**
 * Retrieves actual estimated AWS month-to-date charges from AWS CloudWatch Billing Metric (us-east-1)
 * Or handles fallback if billing data is delayed/unavailable without fabricating numbers.
 */
const fetchAwsBillingCost = async (state) => {
  // If test simulation mode is active, use simulated cost
  if (state.isSimulated || config.AWS_COST_PROTECTION_TEST_MODE) {
    return {
      cost: state.simulatedCost || 0.0,
      isAvailable: true,
      source: 'SIMULATED',
    };
  }

  // If AWS credentials are not configured, use local dev baseline
  if (!isAwsConfigured) {
    return {
      cost: 0.0,
      isAvailable: false,
      source: 'BILLING_DATA_TEMPORARILY_UNAVAILABLE',
      reason: 'AWS credentials not configured in environment',
    };
  }

  try {
    const endTime = new Date();
    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // Past 24 hours

    const command = new GetMetricStatisticsCommand({
      Namespace: 'AWS/Billing',
      MetricName: 'EstimatedCharges',
      Dimensions: [{ Name: 'Currency', Value: 'USD' }],
      StartTime: startTime,
      EndTime: endTime,
      Period: 86400,
      Statistics: ['Maximum'],
    });

    const response = await cloudWatchClient.send(command);
    const dataPoints = response.Datapoints || [];

    if (dataPoints.length > 0) {
      // Sort by timestamp descending to get latest reading
      dataPoints.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
      const latestCost = dataPoints[0].Maximum || 0.0;
      return {
        cost: latestCost,
        isAvailable: true,
        source: 'CLOUDWATCH_BILLING',
      };
    }

    // Billing metrics can be delayed up to several hours in AWS
    return {
      cost: state.estimatedCost || 0.0,
      isAvailable: false,
      source: 'BILLING_DATA_TEMPORARILY_UNAVAILABLE',
      reason: 'CloudWatch billing metric data points not yet published for current cycle',
    };
  } catch (error) {
    console.warn(`[AWS Billing Monitor Warning] Could not fetch CloudWatch billing metric: ${error.message}`);
    return {
      cost: state.estimatedCost || 0.0,
      isAvailable: false,
      source: 'BILLING_DATA_TEMPORARILY_UNAVAILABLE',
      error: error.message,
    };
  }
};

/**
 * Evaluates current cost and in-app usage counters to determine appropriate protection level
 * 5-TIER STATE MACHINE:
 * < $30  -> NORMAL
 * >= $30 -> WARNING
 * >= $40 -> CRITICAL
 * >= $50 -> EMERGENCY
 * >= $60 -> HARD_PROTECTION (Max Budget Cap: $60 vs $96.87 Absolute Credit)
 */
const determineLevelFromMetrics = ({ cost, usageCounters, thresholds, applicationLimits }) => {
  const warning = thresholds.warning || 30.0;
  const critical = thresholds.critical || 40.0;
  const emergency = thresholds.emergency || 50.0;
  const hardProtection = thresholds.hardProtection || 60.0;
  const { maxTextractDocuments, maxEmails, maxAwsOperations, maxSqsMessages } = applicationLimits;

  // 1. Check HARD PROTECTION ($60+)
  if (cost >= hardProtection) {
    return {
      level: COST_PROTECTION_LEVELS.HARD_PROTECTION,
      reason: `Estimated AWS Cost ($${cost.toFixed(2)}) reached/exceeded HARD PROTECTION threshold ($${hardProtection.toFixed(2)}). All expensive workloads locked.`,
      event: COST_PROTECTION_EVENTS.AWS_HARD_PROTECTION,
    };
  }

  // 2. Check In-App Usage Counters Limit Breach (Defense Layer 2 - 100% capacity)
  if (
    (maxTextractDocuments > 0 && usageCounters.textractCalls >= maxTextractDocuments) ||
    (maxAwsOperations > 0 && usageCounters.totalAwsOperations >= maxAwsOperations) ||
    (maxEmails > 0 && usageCounters.emailsSent >= maxEmails) ||
    (maxSqsMessages > 0 && usageCounters.sqsMessages >= maxSqsMessages)
  ) {
    return {
      level: COST_PROTECTION_LEVELS.HARD_PROTECTION,
      reason: `Application usage limit reached (Textract: ${usageCounters.textractCalls}/${maxTextractDocuments}, Ops: ${usageCounters.totalAwsOperations}/${maxAwsOperations}). Activating HARD PROTECTION to preserve AWS credit.`,
      event: COST_PROTECTION_EVENTS.AWS_USAGE_LIMIT_EXCEEDED,
    };
  }

  // 3. Check EMERGENCY ($50+)
  if (cost >= emergency) {
    return {
      level: COST_PROTECTION_LEVELS.EMERGENCY,
      reason: `Estimated AWS Cost ($${cost.toFixed(2)}) reached/exceeded EMERGENCY threshold ($${emergency.toFixed(2)})`,
      event: COST_PROTECTION_EVENTS.AWS_EMERGENCY_SHUTDOWN,
    };
  }

  // 4. Check CRITICAL ($40+)
  if (cost >= critical) {
    return {
      level: COST_PROTECTION_LEVELS.CRITICAL,
      reason: `Estimated AWS Cost ($${cost.toFixed(2)}) reached/exceeded CRITICAL threshold ($${critical.toFixed(2)})`,
      event: COST_PROTECTION_EVENTS.AWS_COST_CRITICAL,
    };
  }

  // Check 90% Application Counter Usage (Critical)
  if (
    (maxTextractDocuments > 0 && usageCounters.textractCalls >= maxTextractDocuments * 0.9) ||
    (maxAwsOperations > 0 && usageCounters.totalAwsOperations >= maxAwsOperations * 0.9)
  ) {
    return {
      level: COST_PROTECTION_LEVELS.CRITICAL,
      reason: `Application usage counters reached 90% capacity. Activating CRITICAL protection.`,
      event: COST_PROTECTION_EVENTS.AWS_COST_CRITICAL,
    };
  }

  // 5. Check WARNING ($30+)
  if (cost >= warning) {
    return {
      level: COST_PROTECTION_LEVELS.WARNING,
      reason: `Estimated AWS Cost ($${cost.toFixed(2)}) reached/exceeded WARNING threshold ($${warning.toFixed(2)})`,
      event: COST_PROTECTION_EVENTS.AWS_COST_WARNING,
    };
  }

  // Check 75% Application Counter Usage (Warning)
  if (
    (maxTextractDocuments > 0 && usageCounters.textractCalls >= maxTextractDocuments * 0.75) ||
    (maxAwsOperations > 0 && usageCounters.totalAwsOperations >= maxAwsOperations * 0.75)
  ) {
    return {
      level: COST_PROTECTION_LEVELS.WARNING,
      reason: `Application usage counters reached 75% capacity. Activating WARNING mode.`,
      event: COST_PROTECTION_EVENTS.AWS_COST_WARNING,
    };
  }

  return {
    level: COST_PROTECTION_LEVELS.NORMAL,
    reason: `AWS usage and costs ($${cost.toFixed(2)}) are within normal operational limits (< $${warning.toFixed(2)})`,
    event: COST_PROTECTION_EVENTS.AWS_COST_NORMAL,
  };
};

/**
 * Executes state transitions and applies circuit breaker rules
 */
const applyProtectionLevel = async (state, { level, reason, event, billingResult }) => {
  const previousLevel = state.currentLevel;

  // RULE: Never automatically return from HARD PROTECTION or EMERGENCY without explicit administrator approval
  if (
    (previousLevel === COST_PROTECTION_LEVELS.HARD_PROTECTION || previousLevel === COST_PROTECTION_LEVELS.EMERGENCY) &&
    (level === COST_PROTECTION_LEVELS.NORMAL || level === COST_PROTECTION_LEVELS.WARNING) &&
    !state.adminOverride?.isResumed
  ) {
    console.log(`[CostProtection Lock] Holding system in ${previousLevel} until administrator explicitly approves resumption.`);
    level = previousLevel;
  }

  const isLevelChanged = previousLevel !== level;

  state.previousLevel = previousLevel;
  state.currentLevel = level;
  state.estimatedCost = billingResult.cost;
  state.isBillingDataAvailable = billingResult.isAvailable;
  state.billingDataSource = billingResult.source;
  state.lastCostCheck = new Date();

  // Reset admin override one-time flag after evaluation
  if (state.adminOverride) {
    state.adminOverride.isResumed = false;
  }

  // Apply service circuit breaker rules based on 5 tiers
  if (level === COST_PROTECTION_LEVELS.NORMAL) {
    // NORMAL Mode (< $30): All services operational
    state.services.textract = { enabled: true, blockedReason: '', pausedAt: null };
    state.services.ses = { enabled: true, blockedReason: '', pausedAt: null };
    state.services.sqs = { enabled: true, blockedReason: '', pausedAt: null };
    state.services.scheduledJobs = { enabled: true, blockedReason: '', pausedAt: null };
    state.services.aiProcessing = { enabled: true, blockedReason: '' };
    state.services.ec2 = { ...state.services.ec2, enabled: true, status: 'RUNNING', stoppedAt: null };
  } else if (level === COST_PROTECTION_LEVELS.WARNING) {
    // WARNING Mode (>= $30): Prevent redundant background tasks, keep core running
    state.services.textract.enabled = true;
    state.services.ses.enabled = true;
    state.services.sqs.enabled = true;
    state.services.scheduledJobs.enabled = true;
  } else if (level === COST_PROTECTION_LEVELS.CRITICAL) {
    // CRITICAL Mode (>= $40): Pause automatic Textract, pause non-critical automated emails and SQS jobs
    state.services.textract = {
      enabled: false,
      blockedReason: 'Paused: AWS Cost in CRITICAL threshold ($40+). Switched to hybrid/offline OCR.',
      pausedAt: state.services.textract.pausedAt || new Date(),
    };
    state.services.scheduledJobs = {
      enabled: false,
      blockedReason: 'Paused: Automated follow-up jobs suspended to conserve AWS credit.',
      pausedAt: state.services.scheduledJobs.pausedAt || new Date(),
    };
  } else if (level === COST_PROTECTION_LEVELS.EMERGENCY) {
    // EMERGENCY Mode (>= $50): Hard blocking of all non-essential AWS workloads (Never delete data)
    const pauseTime = new Date();
    state.services.textract = {
      enabled: false,
      blockedReason: 'EMERGENCY SHUTDOWN ACTIVE ($50+ threshold reached). All Textract OCR processing blocked.',
      pausedAt: state.services.textract.pausedAt || pauseTime,
    };
    state.services.ses = {
      enabled: false,
      blockedReason: 'EMERGENCY SHUTDOWN ACTIVE. Outbound SES email dispatch blocked.',
      pausedAt: state.services.ses.pausedAt || pauseTime,
    };
    state.services.sqs = {
      enabled: false,
      blockedReason: 'EMERGENCY SHUTDOWN ACTIVE. SQS queue dispatch blocked.',
      pausedAt: state.services.sqs.pausedAt || pauseTime,
    };
    state.services.scheduledJobs = {
      enabled: false,
      blockedReason: 'EMERGENCY SHUTDOWN ACTIVE. All scheduled background automations stopped.',
      pausedAt: state.services.scheduledJobs.pausedAt || pauseTime,
    };
    state.services.aiProcessing = {
      enabled: false,
      blockedReason: 'EMERGENCY SHUTDOWN ACTIVE. Expensive AI workloads blocked.',
    };
  } else if (level === COST_PROTECTION_LEVELS.HARD_PROTECTION) {
    // HARD PROTECTION (>= $60): Full shutdown of all billable AWS workloads
    const pauseTime = new Date();
    state.services.textract = {
      enabled: false,
      blockedReason: 'HARD PROTECTION ACTIVE ($60+ cap reached). All Textract calls strictly blocked.',
      pausedAt: state.services.textract.pausedAt || pauseTime,
    };
    state.services.ses = {
      enabled: false,
      blockedReason: 'HARD PROTECTION ACTIVE. Outbound SES email dispatch strictly blocked.',
      pausedAt: state.services.ses.pausedAt || pauseTime,
    };
    state.services.sqs = {
      enabled: false,
      blockedReason: 'HARD PROTECTION ACTIVE. SQS queue dispatch strictly blocked.',
      pausedAt: state.services.sqs.pausedAt || pauseTime,
    };
    state.services.scheduledJobs = {
      enabled: false,
      blockedReason: 'HARD PROTECTION ACTIVE. Scheduled background automation strictly disabled.',
      pausedAt: state.services.scheduledJobs.pausedAt || pauseTime,
    };
    state.services.aiProcessing = {
      enabled: false,
      blockedReason: 'HARD PROTECTION ACTIVE. All optional AI API requests paused.',
    };

    // If EC2 instance ID is configured, mark EC2 stopped
    if (config.AWS_EC2_INSTANCE_ID) {
      state.services.ec2 = {
        enabled: false,
        status: 'STOPPED',
        instanceId: config.AWS_EC2_INSTANCE_ID,
        stoppedAt: pauseTime,
      };
    }
  }

  state.lastProtectionEvent = event;
  state.lastProtectionEventAt = new Date();

  // Record history snapshot
  if (isLevelChanged || state.history.length === 0) {
    state.history.unshift({
      timestamp: new Date(),
      level,
      cost: billingResult.cost,
      event,
      reason,
    });
    if (state.history.length > 50) {
      state.history.pop();
    }
  }

  await state.save();

  // Audit Logging & Admin Notifications when level changes or critical events occur
  if (isLevelChanged || level !== COST_PROTECTION_LEVELS.NORMAL) {
    await logAudit({
      actorId: 'AWS_COST_MONITOR',
      actorType: 'SYSTEM',
      action: event,
      result: level === COST_PROTECTION_LEVELS.NORMAL ? 'SUCCESS' : level === COST_PROTECTION_LEVELS.WARNING ? 'WARNING' : 'FAILURE',
      metadata: {
        previousLevel,
        currentLevel: level,
        estimatedCost: billingResult.cost,
        billingSource: billingResult.source,
        reason,
        usageCounters: state.usageCounters,
      },
    });

    // Real-time broadcast to Admin / Counselor dashboards via Socket.IO
    emitToCounselors('aws:cost-protection-update', {
      currentLevel: level,
      previousLevel,
      estimatedCost: billingResult.cost,
      billingDataSource: billingResult.source,
      event,
      reason,
      services: state.services,
      usageCounters: state.usageCounters,
    });
  }

  return state;
};

/**
 * Performs full evaluation cycle of AWS cost & usage counters
 */
const evaluateProtectionState = async () => {
  try {
    const state = await getCostProtectionState();
    const billingResult = await fetchAwsBillingCost(state);

    // Track monitoring success/failure
    if (billingResult.isAvailable) {
      state.consecutiveMonitoringFailures = 0;
      state.isConservativeMode = false;
    } else {
      state.consecutiveMonitoringFailures += 1;
      // If billing cannot be queried for 5 consecutive cycles, activate conservative mode
      if (state.consecutiveMonitoringFailures >= 5 && state.currentLevel === COST_PROTECTION_LEVELS.NORMAL) {
        state.isConservativeMode = true;
        console.warn('[CostProtection Fail-Safe] Billing data unavailable repeatedly. Enabling conservative limits.');
      }
    }

    const { level, reason, event } = determineLevelFromMetrics({
      cost: billingResult.cost,
      usageCounters: state.usageCounters,
      thresholds: state.thresholds,
      applicationLimits: state.applicationLimits,
    });

    const updatedState = await applyProtectionLevel(state, {
      level,
      reason,
      event,
      billingResult,
    });

    // Dynamically adjust monitoring frequency: 15s in WARNING/CRITICAL/EMERGENCY, 60s in NORMAL
    const targetInterval = (level === COST_PROTECTION_LEVELS.NORMAL) ? 60000 : 15000;
    if (targetInterval !== currentIntervalMs) {
      currentIntervalMs = targetInterval;
      restartMonitoringTimer();
    }

    return updatedState;
  } catch (error) {
    console.error(`[CostProtection Evaluation Error] ${error.message}`);
    return null;
  }
};

/**
 * Circuit Breaker helper: Verifies if a specific AWS service is permitted to run.
 * Throws AwsCostProtectionError if the service is currently blocked or system is in Emergency mode.
 */
const assertServiceAllowed = async (serviceName, operationDescription = 'AWS Operation') => {
  const state = await getCostProtectionState();

  // 1. Check if system is in Emergency or Hard Protection Mode
  if (
    state.currentLevel === COST_PROTECTION_LEVELS.EMERGENCY ||
    state.currentLevel === COST_PROTECTION_LEVELS.HARD_PROTECTION
  ) {
    const serviceStatus = state.services[serviceName];
    if (serviceStatus && !serviceStatus.enabled) {
      console.warn(`[AWS Cost Protection BLOCKED] ${operationDescription} (${serviceName}) blocked due to ${state.currentLevel}.`);
      throw new AwsCostProtectionError(
        "Document verification temporarily paused because AWS cost protection is active.",
        serviceName
      );
    }
  }

  // 2. Check service-level enablement
  const serviceStatus = state.services[serviceName];
  if (serviceStatus && serviceStatus.enabled === false) {
    console.warn(`[AWS Cost Protection BLOCKED] ${operationDescription} (${serviceName}) blocked. Reason: ${serviceStatus.blockedReason}`);
    throw new AwsCostProtectionError(
      "AWS cost protection is currently active. This operation has temporarily been paused to protect the institution's AWS budget.",
      serviceName
    );
  }

  return true;
};

/**
 * Checks if a service is allowed without throwing (boolean return)
 */
const isServiceAllowed = async (serviceName) => {
  try {
    await assertServiceAllowed(serviceName);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Atomically increments an application usage counter and re-evaluates protection
 */
const incrementUsageCounter = async (counterField, amount = 1) => {
  try {
    const update = {
      $inc: {
        [`usageCounters.${counterField}`]: amount,
        'usageCounters.totalAwsOperations': amount,
      },
    };
    await CostProtectionState.findOneAndUpdate(
      { singletonId: 'GLOBAL_AWS_COST_PROTECTION_STATE' },
      update,
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error(`[UsageCounter Error] Failed to increment ${counterField}: ${error.message}`);
  }
};

/**
 * Sets a simulated cost for zero-cost testing ($20, $50, $60, $70, $90)
 */
const setSimulatedCost = async (amount, enableTestMode = true) => {
  const state = await getCostProtectionState();
  state.isSimulated = enableTestMode;
  state.simulatedCost = parseFloat(amount) || 0.0;
  state.estimatedCost = parseFloat(amount) || 0.0;
  state.isBillingDataAvailable = true;
  state.billingDataSource = 'SIMULATED';
  state.lastProtectionEvent = COST_PROTECTION_EVENTS.AWS_SIMULATION_UPDATED;
  state.lastProtectionEventAt = new Date();
  await state.save();

  return await evaluateProtectionState();
};

/**
 * Admin action: Resumes AWS services after manual review.
 * Strictly verifies current cost status before resumption.
 */
const resumeAwsServices = async ({ adminId = 'ADMIN', adminEmail = '', notes = '' }) => {
  const state = await getCostProtectionState();
  const billingResult = await fetchAwsBillingCost(state);

  // Before resuming: verify that simulated or actual AWS cost is below EMERGENCY threshold
  if (billingResult.cost >= state.thresholds.emergency) {
    throw new Error(
      `Cannot resume AWS services: Current estimated cost ($${billingResult.cost.toFixed(2)}) is still at or above the Emergency threshold ($${state.thresholds.emergency.toFixed(2)}). Lower simulated cost or increase budget limit before resuming.`
    );
  }

  state.currentLevel = COST_PROTECTION_LEVELS.NORMAL;
  state.services.textract = { enabled: true, blockedReason: '', pausedAt: null };
  state.services.ses = { enabled: true, blockedReason: '', pausedAt: null };
  state.services.sqs = { enabled: true, blockedReason: '', pausedAt: null };
  state.services.scheduledJobs = { enabled: true, blockedReason: '', pausedAt: null };
  state.services.aiProcessing = { enabled: true, blockedReason: '' };
  state.services.ec2 = { ...state.services.ec2, enabled: true, status: 'RUNNING', stoppedAt: null };

  state.adminOverride = {
    isResumed: true,
    resumedAt: new Date(),
    resumedBy: adminEmail || adminId,
    notes: notes || 'Services manually resumed by administrator after budget verification.',
  };
  state.lastProtectionEvent = COST_PROTECTION_EVENTS.AWS_SERVICE_RESUMED;
  state.lastProtectionEventAt = new Date();
  state.consecutiveMonitoringFailures = 0;
  state.isConservativeMode = false;

  state.history.unshift({
    timestamp: new Date(),
    level: COST_PROTECTION_LEVELS.NORMAL,
    cost: billingResult.cost,
    event: COST_PROTECTION_EVENTS.AWS_SERVICE_RESUMED,
    reason: `Services resumed by ${adminEmail || adminId}: ${notes}`,
  });

  await state.save();

  await logAudit({
    actorId: adminId,
    actorType: 'ADMIN',
    action: COST_PROTECTION_EVENTS.AWS_SERVICE_RESUMED,
    result: 'SUCCESS',
    metadata: {
      adminEmail,
      notes,
      effectiveCost: billingResult.cost,
      thresholds: state.thresholds,
    },
  });

  emitToCounselors('aws:cost-protection-update', {
    currentLevel: COST_PROTECTION_LEVELS.NORMAL,
    estimatedCost: billingResult.cost,
    event: COST_PROTECTION_EVENTS.AWS_SERVICE_RESUMED,
    reason: 'Services manually resumed by administrator',
    services: state.services,
  });

  return state;
};

/**
 * Updates configurable thresholds and limits dynamically
 */
const updateThresholdsAndLimits = async ({ thresholds = {}, limits = {} }) => {
  const state = await getCostProtectionState();

  if (thresholds.warning) state.thresholds.warning = parseFloat(thresholds.warning);
  if (thresholds.critical) state.thresholds.critical = parseFloat(thresholds.critical);
  if (thresholds.emergency) state.thresholds.emergency = parseFloat(thresholds.emergency);
  if (thresholds.budgetLimit) state.thresholds.budgetLimit = parseFloat(thresholds.budgetLimit);

  if (limits.maxTextractDocuments) state.applicationLimits.maxTextractDocuments = parseInt(limits.maxTextractDocuments, 10);
  if (limits.maxEmails) state.applicationLimits.maxEmails = parseInt(limits.maxEmails, 10);
  if (limits.maxAwsOperations) state.applicationLimits.maxAwsOperations = parseInt(limits.maxAwsOperations, 10);
  if (limits.maxSqsMessages) state.applicationLimits.maxSqsMessages = parseInt(limits.maxSqsMessages, 10);
  if (limits.maxRetries) state.applicationLimits.maxRetries = parseInt(limits.maxRetries, 10);

  await state.save();
  return await evaluateProtectionState();
};

/**
 * Starts background cost monitoring timer
 */
const startCostMonitoring = () => {
  if (monitoringTimer) {
    clearInterval(monitoringTimer);
  }
  // Run initial evaluation
  evaluateProtectionState();
  monitoringTimer = setInterval(() => {
    evaluateProtectionState();
  }, currentIntervalMs);
  console.log(`[AWS Cost Protection System] Initialized. Background monitor polling interval: ${currentIntervalMs / 1000}s`);
};

const restartMonitoringTimer = () => {
  if (monitoringTimer) {
    clearInterval(monitoringTimer);
    monitoringTimer = setInterval(() => {
      evaluateProtectionState();
    }, currentIntervalMs);
    console.log(`[AWS Cost Protection Monitor] Polling interval updated to ${currentIntervalMs / 1000}s`);
  }
};

module.exports = {
  AwsCostProtectionError,
  getCostProtectionState,
  fetchAwsBillingCost,
  determineLevelFromMetrics,
  evaluateProtectionState,
  assertServiceAllowed,
  isServiceAllowed,
  incrementUsageCounter,
  setSimulatedCost,
  resumeAwsServices,
  updateThresholdsAndLimits,
  startCostMonitoring,
};
