const express = require('express');
const router = express.Router();
const axios = require('axios');
const { checkDBHealth } = require('../config/db');
const {
  isAwsConfigured,
  checkS3Health,
  checkSQSHealth,
  checkSESHealth,
  checkTextractHealth,
} = require('../config/aws');
const config = require('../config/env');
const { sendSuccess } = require('../utils/responseHandler');

const { getCostProtectionState } = require('../services/costProtectionService');

/**
 * @route   GET /health
 * @desc    Comprehensive system health report
 */
router.get('/', async (req, res) => {
  const dbHealth = checkDBHealth();
  const [s3Health, sqsHealth, sesHealth, textractHealth, costState] = await Promise.all([
    checkS3Health(),
    checkSQSHealth(),
    checkSESHealth(),
    checkTextractHealth(),
    getCostProtectionState().catch(() => null),
  ]);

  let aiHealth = { status: 'OFFLINE', message: 'AI service unreachable' };
  try {
    const aiRes = await axios.get(`${config.AI_SERVICE_URL}/health`, { timeout: 2000 });
    aiHealth = aiRes.data;
  } catch (e) {
    aiHealth = { status: 'DEGRADED', message: 'FastAPI AI agent service not connected; fallback engine active.' };
  }

  const overallStatus = dbHealth.status === 'UP' ? 'HEALTHY' : 'UNHEALTHY';

  return res.status(overallStatus === 'HEALTHY' ? 200 : 503).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    components: {
      database: dbHealth,
      aws: {
        isConfigured: isAwsConfigured,
        region: config.AWS_REGION,
        s3: s3Health,
        sqs: sqsHealth,
        ses: sesHealth,
        textract: textractHealth,
        costProtection: {
          level: costState?.currentLevel || 'NORMAL',
          estimatedCost: costState?.estimatedCost || 0.0,
          budgetLimit: costState?.thresholds?.budgetLimit || config.AWS_BUDGET_LIMIT,
          isBillingDataAvailable: costState?.isBillingDataAvailable || false,
          services: costState?.services || {},
          usageCounters: costState?.usageCounters || {},
        },
      },
      aiAgent: aiHealth,
    },
  });
});


/**
 * @route   GET /health/database
 */
router.get('/database', (req, res) => {
  const health = checkDBHealth();
  return res.status(health.status === 'UP' ? 200 : 503).json(health);
});

/**
 * @route   GET /health/aws
 */
router.get('/aws', async (req, res) => {
  const [s3, sqs, ses, textract, costState] = await Promise.all([
    checkS3Health(),
    checkSQSHealth(),
    checkSESHealth(),
    checkTextractHealth(),
    getCostProtectionState().catch(() => null),
  ]);
  return sendSuccess(res, {
    isAwsConfigured,
    s3,
    sqs,
    ses,
    textract,
    costProtection: {
      level: costState?.currentLevel || 'NORMAL',
      estimatedCost: costState?.estimatedCost || 0.0,
      budgetLimit: costState?.thresholds?.budgetLimit || config.AWS_BUDGET_LIMIT,
      services: costState?.services || {},
      usageCounters: costState?.usageCounters || {},
    },
  });
});

/**
 * @route   GET /health/s3
 */
router.get('/s3', async (req, res) => {
  const health = await checkS3Health();
  return sendSuccess(res, health);
});

/**
 * @route   GET /health/sqs
 */
router.get('/sqs', async (req, res) => {
  const health = await checkSQSHealth();
  return sendSuccess(res, health);
});

/**
 * @route   GET /health/ses
 */
router.get('/ses', async (req, res) => {
  const health = await checkSESHealth();
  return sendSuccess(res, health);
});

/**
 * @route   GET /health/textract
 */
router.get('/textract', async (req, res) => {
  const health = await checkTextractHealth();
  return sendSuccess(res, health);
});

/**
 * @route   GET /health/ai
 */
router.get('/ai', async (req, res) => {
  try {
    const aiRes = await axios.get(`${config.AI_SERVICE_URL}/health`, { timeout: 2000 });
    return sendSuccess(res, aiRes.data);
  } catch (e) {
    return sendSuccess(res, {
      status: 'FALLBACK_READY',
      message: 'FastAPI service offline, NodeJS autonomous engine active',
    });
  }
});

module.exports = router;
