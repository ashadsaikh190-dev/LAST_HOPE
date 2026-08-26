const express = require('express');
const router = express.Router();
const Enrollment = require('../models/Enrollment');
const Student = require('../models/Student');
const Application = require('../models/Application');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { ROLES } = require('../config/constants');
const { generateOfficialEnrollment } = require('../services/enrollmentService');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * @route   GET /api/enrollment/me
 * @desc    Get current student's official enrollment certificate/card
 */
router.get('/me', protect, authorize(ROLES.STUDENT), async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findOne({ student: req.student._id })
      .populate('program')
      .populate('student')
      .populate('application');

    if (!enrollment) {
      return sendSuccess(res, null, 'Official enrollment not yet generated');
    }

    return sendSuccess(res, enrollment);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/enrollment/:id
 * @desc    Get enrollment record by ID or Enrollment Number
 */
router.get('/:id', protect, async (req, res, next) => {
  try {
    let enrollment;
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      enrollment = await Enrollment.findById(req.params.id)
        .populate('program student application');
    } else {
      enrollment = await Enrollment.findOne({ enrollmentNumber: req.params.id.toUpperCase() })
        .populate('program student application');
    }

    if (!enrollment) {
      return sendError(res, 'Enrollment record not found', 404, 'NOT_FOUND');
    }

    // Role check
    if (req.user.role === ROLES.STUDENT && String(enrollment.student._id) !== String(req.student._id)) {
      return sendError(res, 'Unauthorized to view this enrollment record', 403, 'AUTHORIZATION_ERROR');
    }

    return sendSuccess(res, enrollment);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/enrollment/generate
 * @desc    Generate official enrollment number (Idempotent & prerequisite verified)
 */
router.post('/generate', protect, authorize(ROLES.COUNSELOR, ROLES.ADMIN), async (req, res, next) => {
  try {
    const { studentId, applicationId } = req.body;
    if (!studentId || !applicationId) {
      return sendError(res, 'studentId and applicationId are required', 400, 'VALIDATION_ERROR');
    }

    const result = await generateOfficialEnrollment({
      studentId,
      applicationId,
      actorId: req.user._id,
      actorType: req.user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, result.enrollment, result.message, result.isNew ? 201 : 200);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
