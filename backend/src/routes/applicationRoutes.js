const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const Student = require('../models/Student');
const Program = require('../models/Program');
const Document = require('../models/Document');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { ROLES, LIFECYCLE_STAGES, DOCUMENT_STATUS } = require('../config/constants');
const { generateApplicationId } = require('../utils/idGenerator');
const { transitionStudentStage } = require('../services/stateMachineService');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * @route   POST /api/applications
 * @desc    Submit new admission application
 */
router.post('/', protect, authorize(ROLES.STUDENT), async (req, res, next) => {
  try {
    const student = req.student;
    const { programId, personalDetails, academicDetails, academicYear = '2026-2027' } = req.body;

    const program = await Program.findById(programId);
    if (!program) {
      return sendError(res, 'Specified program not found', 404, 'NOT_FOUND');
    }

    // Check if application already exists for this student
    const existingApp = await Application.findOne({ student: student._id });
    if (existingApp) {
      return sendError(res, 'An application has already been submitted for this account.', 400, 'APPLICATION_EXISTS');
    }

    const applicationId = generateApplicationId();

    const application = await Application.create({
      applicationId,
      student: student._id,
      trackingId: student.trackingId,
      program: program._id,
      academicYear,
      personalDetails,
      academicDetails,
      status: LIFECYCLE_STAGES.APPLICATION_COMPLETED,
      submissionDate: new Date(),
      isPaymentRequired: (program.applicationFee || 0) > 0,
    });

    // Update student references and academic info
    student.currentApplication = application._id;
    student.selectedProgram = program._id;
    student.academicProfile = {
      tenthMarks: academicDetails.tenthPercentage,
      tenthBoard: academicDetails.tenthBoard,
      tenthPassingYear: academicDetails.tenthPassingYear,
      twelfthMarks: academicDetails.twelfthPercentage,
      twelfthBoard: academicDetails.twelfthBoard,
      twelfthPassingYear: academicDetails.twelfthPassingYear,
      twelfthStream: academicDetails.twelfthStream,
    };
    await student.save();

    // Advance lifecycle stage to APPLICATION_COMPLETED and DOCUMENTS_PENDING
    await transitionStudentStage({
      studentId: student._id,
      targetStage: LIFECYCLE_STAGES.APPLICATION_COMPLETED,
      actorId: req.user._id,
      actorType: 'STUDENT',
      reason: 'Student submitted application form',
    });

    // Initialize required Document placeholder entries for this program
    const requiredDocTypes = program.requiredDocumentTypes || [
      'IDENTITY_PROOF',
      'MARKSHEET_10TH',
      'MARKSHEET_12TH',
      'PASSPORT_PHOTO',
    ];

    for (const docType of requiredDocTypes) {
      await Document.findOneAndUpdate(
        { student: student._id, documentType: docType },
        {
          student: student._id,
          trackingId: student.trackingId,
          application: application._id,
          documentType: docType,
          status: DOCUMENT_STATUS.NOT_UPLOADED,
          isRequired: true,
        },
        { upsert: true }
      );
    }

    await logAudit({
      actorId: req.user._id,
      actorType: 'STUDENT',
      studentId: student._id,
      trackingId: student.trackingId,
      action: 'APPLICATION_SUBMITTED',
      metadata: { applicationId, programCode: program.code, programName: program.name },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    await createNotification({
      studentId: student._id,
      trackingId: student.trackingId,
      type: 'EMAIL',
      title: 'Application Received - GIET Admissions',
      content: `Your application (${applicationId}) for ${program.name} has been received. Please upload your required documents to proceed with autonomous verification.`,
      recipient: student.email,
    });

    return sendSuccess(
      res,
      application,
      'Application submitted successfully. Required document checklist generated.',
      201
    );
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/applications/me
 * @desc    Get current student's application
 */
router.get('/me', protect, authorize(ROLES.STUDENT), async (req, res, next) => {
  try {
    const application = await Application.findOne({ student: req.student._id })
      .populate('program')
      .populate('student');

    if (!application) {
      return sendSuccess(res, null, 'No application submitted yet');
    }

    return sendSuccess(res, application);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/applications/:id
 * @desc    Get application by ID (Counselor / Admin or Owner Student)
 */
router.get('/:id', protect, async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('program')
      .populate('student');

    if (!application) {
      return sendError(res, 'Application not found', 404, 'NOT_FOUND');
    }

    if (req.user.role === ROLES.STUDENT && String(application.student._id) !== String(req.student._id)) {
      return sendError(res, 'Unauthorized access to application', 403, 'AUTHORIZATION_ERROR');
    }

    return sendSuccess(res, application);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
