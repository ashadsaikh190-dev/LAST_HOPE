const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Program = require('../models/Program');
const AuditLog = require('../models/AuditLog');
const Workflow = require('../models/Workflow');
const SystemError = require('../models/SystemError');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { ROLES } = require('../config/constants');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * @route   GET /api/admin/analytics
 * @desc    Comprehensive Institutional Analytics calculated from real database
 */
router.get('/analytics', protect, authorize(ROLES.ADMIN), async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalApplications,
      totalPrograms,
      totalErrors,
      unresolvedErrors,
      programDistribution,
      stageDistribution,
    ] = await Promise.all([
      User.countDocuments(),
      Student.countDocuments(),
      Application.countDocuments(),
      Program.countDocuments(),
      SystemError.countDocuments(),
      SystemError.countDocuments({ isResolved: false }),
      Student.aggregate([
        { $match: { selectedProgram: { $ne: null } } },
        { $group: { _id: '$selectedProgram', count: { $sum: 1 } } },
        {
          $lookup: {
            from: 'programs',
            localField: '_id',
            foreignField: '_id',
            as: 'program',
          },
        },
        { $unwind: '$program' },
        { $project: { programName: '$program.name', programCode: '$program.code', count: 1 } },
      ]),
      Student.aggregate([
        { $group: { _id: '$currentStage', count: { $sum: 1 } } },
        { $project: { stage: '$_id', count: 1, _id: 0 } },
      ]),
    ]);

    return sendSuccess(res, {
      totalUsers,
      totalStudents,
      totalApplications,
      totalPrograms,
      totalErrors,
      unresolvedErrors,
      programDistribution,
      stageDistribution,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Query audit logs with pagination and filters
 */
router.get('/audit-logs', protect, authorize(ROLES.ADMIN), async (req, res, next) => {
  try {
    const { action, actorType, trackingId, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (actorType) filter.actorType = actorType;
    if (trackingId) filter.trackingId = trackingId;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      logs,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    List system users (Admins, Counselors)
 */
router.get('/users', protect, authorize(ROLES.ADMIN), async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return sendSuccess(res, users);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/admin/users
 * @desc    Create Counselor or Admin staff user
 */
router.post('/users', protect, authorize(ROLES.ADMIN), async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password || !role) {
      return sendError(res, 'Name, email, password, and role are required', 400, 'VALIDATION_ERROR');
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return sendError(res, 'User with this email already exists', 400, 'USER_EXISTS');
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role,
      phone: phone || '',
    });

    return sendSuccess(
      res,
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      'Staff user created successfully',
      201
    );
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/workflows
 * @desc    Get automated workflow definitions
 */
router.get('/workflows', protect, authorize(ROLES.ADMIN), async (req, res, next) => {
  try {
    const workflows = await Workflow.find().sort({ createdAt: -1 });
    return sendSuccess(res, workflows);
  } catch (error) {
    next(error);
  }
});

/**
 * ============================================================================
 * AWS COST PROTECTION & EMERGENCY SHUTDOWN CONTROL API
 * ============================================================================
 */

const {
  getCostProtectionState,
  evaluateProtectionState,
  setSimulatedCost,
  resumeAwsServices,
  updateThresholdsAndLimits,
} = require('../services/costProtectionService');

/**
 * @route   GET /api/admin/cost-protection
 * @desc    Get real-time AWS cost safety state, budget limits, counters, and service statuses
 */
router.get('/cost-protection', protect, authorize(ROLES.ADMIN), async (req, res, next) => {
  try {
    const state = await getCostProtectionState();
    
    // Fetch recent cost-related audit logs
    const recentCostLogs = await AuditLog.find({
      action: { $regex: /^AWS_/ },
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    return sendSuccess(res, {
      state,
      recentCostLogs,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/admin/cost-protection/simulate
 * @desc    Simulate AWS cost ($20, $50, $60, $70, $90) for testing without spending real money
 */
router.post('/cost-protection/simulate', protect, authorize(ROLES.ADMIN), async (req, res, next) => {
  try {
    const { amount, enableTestMode = true } = req.body;
    if (amount === undefined || amount === null) {
      return sendError(res, 'Simulated amount is required', 400, 'VALIDATION_ERROR');
    }

    const updatedState = await setSimulatedCost(parseFloat(amount), Boolean(enableTestMode));
    return sendSuccess(
      res,
      updatedState,
      `Simulated AWS cost set to $${parseFloat(amount).toFixed(2)}. Protection level evaluated to ${updatedState.currentLevel}.`
    );
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/admin/cost-protection/resume
 * @desc    Admin manually resumes AWS services after verifying cost safety
 */
router.post('/cost-protection/resume', protect, authorize(ROLES.ADMIN), async (req, res, next) => {
  try {
    const { notes } = req.body;
    const updatedState = await resumeAwsServices({
      adminId: req.user._id,
      adminEmail: req.user.email,
      notes: notes || 'Admin verified budget safety and approved resumption.',
    });

    return sendSuccess(res, updatedState, 'AWS services successfully resumed after administrator review.');
  } catch (error) {
    return sendError(res, error.message, 400, 'RESUME_FAILED');
  }
});

/**
 * @route   POST /api/admin/cost-protection/update-thresholds
 * @desc    Configure Warning, Critical, and Emergency thresholds and application limits
 */
router.post('/cost-protection/update-thresholds', protect, authorize(ROLES.ADMIN), async (req, res, next) => {
  try {
    const { thresholds, limits } = req.body;
    const updatedState = await updateThresholdsAndLimits({ thresholds, limits });
    return sendSuccess(res, updatedState, 'AWS Cost Protection thresholds updated successfully.');
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/admin/cost-protection/trigger-check
 * @desc    Force an immediate AWS billing and usage evaluation cycle
 */
router.post('/cost-protection/trigger-check', protect, authorize(ROLES.ADMIN), async (req, res, next) => {
  try {
    const updatedState = await evaluateProtectionState();
    return sendSuccess(res, updatedState, 'Cost protection evaluation completed.');
  } catch (error) {
    next(error);
  }
});

module.exports = router;

