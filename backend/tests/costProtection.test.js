const {
  determineLevelFromMetrics,
} = require('../src/services/costProtectionService');
const { COST_PROTECTION_LEVELS, COST_PROTECTION_EVENTS } = require('../src/config/constants');
const { withRetryProtection } = require('../src/utils/retryHelper');

describe('AWS Cost Protection & Threshold Multi-Layer Tests (5-Tier State Machine)', () => {
  const standardThresholds = {
    budgetLimit: 96.87,
    targetLimit: 50.0,
    warning: 30.0,
    critical: 40.0,
    emergency: 50.0,
    hardProtection: 60.0,
  };

  const standardLimits = {
    maxTextractDocuments: 50,
    maxEmails: 200,
    maxAwsOperations: 1000,
    maxSqsMessages: 500,
    maxLambdaOperations: 500,
    maxRetries: 3,
  };

  const zeroCounters = {
    textractCalls: 0,
    emailsSent: 0,
    sqsMessages: 0,
    lambdaOperations: 0,
    totalAwsOperations: 0,
  };

  test('$20 cost evaluates to NORMAL level with all services enabled (< $30)', () => {
    const result = determineLevelFromMetrics({
      cost: 20.0,
      usageCounters: zeroCounters,
      thresholds: standardThresholds,
      applicationLimits: standardLimits,
    });

    expect(result.level).toBe(COST_PROTECTION_LEVELS.NORMAL);
    expect(result.event).toBe(COST_PROTECTION_EVENTS.AWS_COST_NORMAL);
  });

  test('$30 cost evaluates to WARNING level ($30 threshold)', () => {
    const result = determineLevelFromMetrics({
      cost: 30.0,
      usageCounters: zeroCounters,
      thresholds: standardThresholds,
      applicationLimits: standardLimits,
    });

    expect(result.level).toBe(COST_PROTECTION_LEVELS.WARNING);
    expect(result.event).toBe(COST_PROTECTION_EVENTS.AWS_COST_WARNING);
  });

  test('$40 cost evaluates to CRITICAL level ($40 threshold)', () => {
    const result = determineLevelFromMetrics({
      cost: 40.0,
      usageCounters: zeroCounters,
      thresholds: standardThresholds,
      applicationLimits: standardLimits,
    });

    expect(result.level).toBe(COST_PROTECTION_LEVELS.CRITICAL);
    expect(result.event).toBe(COST_PROTECTION_EVENTS.AWS_COST_CRITICAL);
  });

  test('$50 cost evaluates to EMERGENCY level ($50 emergency shutdown threshold)', () => {
    const result = determineLevelFromMetrics({
      cost: 50.0,
      usageCounters: zeroCounters,
      thresholds: standardThresholds,
      applicationLimits: standardLimits,
    });

    expect(result.level).toBe(COST_PROTECTION_LEVELS.EMERGENCY);
    expect(result.event).toBe(COST_PROTECTION_EVENTS.AWS_EMERGENCY_SHUTDOWN);
  });

  test('$60 cost evaluates to HARD_PROTECTION level ($60 absolute project budget cap)', () => {
    const result = determineLevelFromMetrics({
      cost: 60.0,
      usageCounters: zeroCounters,
      thresholds: standardThresholds,
      applicationLimits: standardLimits,
    });

    expect(result.level).toBe(COST_PROTECTION_LEVELS.HARD_PROTECTION);
    expect(result.event).toBe(COST_PROTECTION_EVENTS.AWS_HARD_PROTECTION);
  });

  test('$90 cost evaluates to HARD_PROTECTION level (well before $96.87 maximum credit)', () => {
    const result = determineLevelFromMetrics({
      cost: 90.0,
      usageCounters: zeroCounters,
      thresholds: standardThresholds,
      applicationLimits: standardLimits,
    });

    expect(result.level).toBe(COST_PROTECTION_LEVELS.HARD_PROTECTION);
    expect(result.event).toBe(COST_PROTECTION_EVENTS.AWS_HARD_PROTECTION);
  });

  test('Defense Layer 2: In-app Textract limit breach (50 docs) triggers HARD_PROTECTION even at $0 billed', () => {
    const breachCounters = {
      ...zeroCounters,
      textractCalls: 50,
    };

    const result = determineLevelFromMetrics({
      cost: 0.0,
      usageCounters: breachCounters,
      thresholds: standardThresholds,
      applicationLimits: standardLimits,
    });

    expect(result.level).toBe(COST_PROTECTION_LEVELS.HARD_PROTECTION);
    expect(result.event).toBe(COST_PROTECTION_EVENTS.AWS_USAGE_LIMIT_EXCEEDED);
  });

  test('Defense Layer 2: Total AWS Operations limit breach (1000 ops) triggers HARD_PROTECTION', () => {
    const breachCounters = {
      ...zeroCounters,
      totalAwsOperations: 1000,
    };

    const result = determineLevelFromMetrics({
      cost: 0.0,
      usageCounters: breachCounters,
      thresholds: standardThresholds,
      applicationLimits: standardLimits,
    });

    expect(result.level).toBe(COST_PROTECTION_LEVELS.HARD_PROTECTION);
    expect(result.event).toBe(COST_PROTECTION_EVENTS.AWS_USAGE_LIMIT_EXCEEDED);
  });

  test('Defense Layer 2: 75% Textract document limit triggers WARNING', () => {
    const warningCounters = {
      ...zeroCounters,
      textractCalls: 38,
    };

    const result = determineLevelFromMetrics({
      cost: 0.0,
      usageCounters: warningCounters,
      thresholds: standardThresholds,
      applicationLimits: standardLimits,
    });

    expect(result.level).toBe(COST_PROTECTION_LEVELS.WARNING);
    expect(result.event).toBe(COST_PROTECTION_EVENTS.AWS_COST_WARNING);
  });

  test('Defense Layer 2: 90% Textract document limit triggers CRITICAL', () => {
    const criticalCounters = {
      ...zeroCounters,
      textractCalls: 45,
    };

    const result = determineLevelFromMetrics({
      cost: 0.0,
      usageCounters: criticalCounters,
      thresholds: standardThresholds,
      applicationLimits: standardLimits,
    });

    expect(result.level).toBe(COST_PROTECTION_LEVELS.CRITICAL);
    expect(result.event).toBe(COST_PROTECTION_EVENTS.AWS_COST_CRITICAL);
  });
});

describe('Retry Protection & Backoff Limits Tests', () => {
  test('withRetryProtection retries up to maxRetries (3) and halts without infinite loop', async () => {
    let attemptsCount = 0;

    await expect(
      withRetryProtection({
        operationName: 'TEST_AWS_CALL',
        maxRetries: 3,
        initialDelayMs: 50,
        fn: async (attempt) => {
          attemptsCount = attempt;
          throw new Error('Simulated AWS 503 Service Unavailable');
        },
      })
    ).rejects.toThrow('failed after 3 attempts (Retry limit reached)');

    expect(attemptsCount).toBe(3);
  });

  test('withRetryProtection succeeds immediately if first attempt passes', async () => {
    let attemptsCount = 0;

    const result = await withRetryProtection({
      operationName: 'TEST_AWS_CALL_SUCCESS',
      maxRetries: 3,
      initialDelayMs: 50,
      fn: async (attempt) => {
        attemptsCount = attempt;
        return { data: 'aws_success' };
      },
    });

    expect(attemptsCount).toBe(1);
    expect(result.data).toBe('aws_success');
  });
});

describe('AWS Cost Protection Error Handling & Zero Data Loss Guarantee', () => {
  const { AwsCostProtectionError } = require('../src/services/costProtectionService');

  test('AwsCostProtectionError has 429 status code and required standard institution message', () => {
    const error = new AwsCostProtectionError();
    expect(error.statusCode).toBe(429);
    expect(error.code).toBe('AWS_COST_PROTECTION_ACTIVE');
    expect(error.message).toContain('AWS cost protection');
  });
});
