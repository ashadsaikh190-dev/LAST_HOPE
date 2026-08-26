const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const StudentPersona = require('../models/StudentPersona');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const CounselorCase = require('../models/CounselorCase');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { ROLES, COUNSELOR_CASE_PRIORITY, COUNSELOR_CASE_CATEGORY } = require('../config/constants');
const { generateCaseId } = require('../utils/idGenerator');
const { logAudit } = require('../services/auditService');
const { emitToCounselors } = require('../config/socket');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * @route   GET /api/students/me
 * @desc    Get current student full profile with application & program
 */
router.get('/me', protect, authorize(ROLES.STUDENT), async (req, res, next) => {
  try {
    const student = await Student.findOne({ user: req.user._id })
      .populate('selectedProgram currentApplication persona');
    
    if (!student) {
      return sendError(res, 'Student profile not found', 404, 'NOT_FOUND');
    }

    return sendSuccess(res, student);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/students/me
 * @desc    Update personal/academic profile
 */
router.put('/me', protect, authorize(ROLES.STUDENT), async (req, res, next) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) {
      return sendError(res, 'Student profile not found', 404, 'NOT_FOUND');
    }

    const { phone, address, academicProfile, selectedProgramId } = req.body;
    if (phone) student.phone = phone;
    if (address) student.address = { ...student.address, ...address };
    if (academicProfile) student.academicProfile = { ...student.academicProfile, ...academicProfile };
    if (selectedProgramId) student.selectedProgram = selectedProgramId;

    await student.save();

    await logAudit({
      actorId: req.user._id,
      actorType: 'STUDENT',
      studentId: student._id,
      trackingId: student.trackingId,
      action: 'STUDENT_PROFILE_UPDATED',
      metadata: { fieldsUpdated: Object.keys(req.body) },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, student, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/students/timeline
 * @desc    Retrieve complete chronological real event history
 */
router.get('/timeline', protect, authorize(ROLES.STUDENT), async (req, res, next) => {
  try {
    const student = req.student;
    if (!student) {
      return sendError(res, 'Student profile not found', 404, 'NOT_FOUND');
    }

    const logs = await AuditLog.find({ trackingId: student.trackingId })
      .sort({ timestamp: 1 })
      .lean();

    return sendSuccess(res, logs);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/students/notifications
 * @desc    Get student notifications
 */
router.get('/notifications', protect, async (req, res, next) => {
  try {
    if (req.student) {
      const notifications = await Notification.find({ student: req.student._id })
        .sort({ createdAt: -1 })
        .limit(50);
      return sendSuccess(res, notifications);
    } else {
      const notifications = await Notification.find({ recipient: { $in: [req.user.email, 'system', req.user.role] } })
        .sort({ createdAt: -1 })
        .limit(50);
      return sendSuccess(res, notifications);
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/students/notifications/:id/read
 * @desc    Mark notification as read
 */
router.put('/notifications/:id/read', protect, authorize(ROLES.STUDENT), async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, student: req.student._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    return sendSuccess(res, notification);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/students/request-fee-waiver
 * @desc    Submit a special fee waiver request (escalates to counselor)
 */
router.post('/request-fee-waiver', protect, authorize(ROLES.STUDENT), async (req, res, next) => {
  try {
    const student = req.student;
    const { reason, annualFamilyIncome } = req.body;

    student.isSpecialFeeWaiverRequested = true;
    await student.save();

    const caseId = generateCaseId();
    const counselorCase = await CounselorCase.create({
      caseId,
      student: student._id,
      trackingId: student.trackingId,
      priority: COUNSELOR_CASE_PRIORITY.HIGH,
      category: COUNSELOR_CASE_CATEGORY.FEE_WAIVER,
      summary: `Special Fee Waiver Request by ${student.firstName} ${student.lastName}`,
      aiReason: `Student requested fee exemption. Stated reason: "${reason}". Reported Income: ₹${annualFamilyIncome || 'N/A'}.`,
      recommendedAction: 'Verify family income documentation and evaluate against institutional scholarship policy.',
    });

    emitToCounselors('case:escalated', {
      caseId,
      trackingId: student.trackingId,
      category: COUNSELOR_CASE_CATEGORY.FEE_WAIVER,
      summary: counselorCase.summary,
    });

    await logAudit({
      actorId: req.user._id,
      actorType: 'STUDENT',
      studentId: student._id,
      trackingId: student.trackingId,
      action: 'FEE_WAIVER_REQUESTED',
      metadata: { caseId, reason },
    });

    return sendSuccess(
      res,
      counselorCase,
      'Fee waiver request received and escalated to admissions counselor for review.'
    );
  } catch (error) {
    next(error);
  }
});

module.exports = router;
