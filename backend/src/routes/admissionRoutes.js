const express = require('express');
const router = express.Router();
const Admission = require('../models/Admission');
const Application = require('../models/Application');
const Student = require('../models/Student');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { ROLES, ADMISSION_STATUS, LIFECYCLE_STAGES } = require('../config/constants');
const { transitionStudentStage } = require('../services/stateMachineService');
const { generateOfficialEnrollment } = require('../services/enrollmentService');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');
const { emitToStudent, emitToCounselors } = require('../config/socket');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * @route   GET /api/admission/me
 * @desc    Get current student's admission offer
 */
router.get('/me', protect, authorize(ROLES.STUDENT), async (req, res, next) => {
  try {
    const admission = await Admission.findOne({ student: req.student._id })
      .populate('program application');

    return sendSuccess(res, admission);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/admission/:applicationId/approve
 * @desc    Approve admission and automatically issue official Enrollment Number
 */
router.post('/:applicationId/approve', protect, authorize(ROLES.COUNSELOR, ROLES.ADMIN), async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const { scholarshipPercentage = 0, decisionNotes = 'Approved following verification of credentials' } = req.body;

    const application = await Application.findById(applicationId).populate('student program');
    if (!application) {
      return sendError(res, 'Application not found', 404, 'NOT_FOUND');
    }

    const student = application.student;

    // Create or Update Admission Offer
    const admission = await Admission.findOneAndUpdate(
      { application: application._id },
      {
        application: application._id,
        student: student._id,
        trackingId: student.trackingId,
        program: application.program._id,
        status: ADMISSION_STATUS.APPROVED,
        offerDate: new Date(),
        acceptanceDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        scholarshipPercentage,
        decisionNotes,
        decisionBy: `${req.user.name} (${req.user.role})`,
      },
      { upsert: true, new: true }
    );

    // Transition Student Stage to ADMISSION_APPROVED
    await transitionStudentStage({
      studentId: student._id,
      targetStage: LIFECYCLE_STAGES.ADMISSION_APPROVED,
      actorId: req.user._id,
      actorType: req.user.role,
      reason: 'Admission offer approved by institutional authority',
    });

    await logAudit({
      actorId: req.user._id,
      actorType: req.user.role,
      studentId: student._id,
      trackingId: student.trackingId,
      action: 'ADMISSION_OFFER_APPROVED',
      metadata: { applicationId: application.applicationId, scholarshipPercentage },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Automatically trigger Official Enrollment Generation
    const enrollmentResult = await generateOfficialEnrollment({
      studentId: student._id,
      applicationId: application._id,
      actorId: req.user._id,
      actorType: req.user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    emitToStudent(student.trackingId, 'admission:approved', {
      admission,
      enrollment: enrollmentResult.enrollment,
    });

    return sendSuccess(
      res,
      {
        admission,
        enrollment: enrollmentResult.enrollment,
      },
      'Admission approved and official Enrollment Number issued successfully.'
    );
  } catch (error) {
    next(error);
  }
});

module.exports = router;
