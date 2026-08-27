const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Lead = require('../models/Lead');
const Application = require('../models/Application');
const Document = require('../models/Document');
const DocumentVersion = require('../models/DocumentVersion');
const DocumentVerification = require('../models/DocumentVerification');
const Payment = require('../models/Payment');
const Admission = require('../models/Admission');
const Enrollment = require('../models/Enrollment');
const CounselorCase = require('../models/CounselorCase');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const AuditLog = require('../models/AuditLog');
const AIAction = require('../models/AIAction');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
  ROLES,
  COUNSELOR_CASE_STATUS,
  DOCUMENT_STATUS,
  LIFECYCLE_STAGES,
  PAYMENT_STATUS,
} = require('../config/constants');
const { logAudit } = require('../services/auditService');
const { transitionStudentStage } = require('../services/stateMachineService');
const { createNotification } = require('../services/notificationService');
const { EVENTS, dispatchEvent } = require('../services/eventBusService');
const { calculateStudentIntelligence } = require('../services/intelligenceService');
const { emitToStudent, emitToCounselors } = require('../config/socket');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// Enforce authentication & role protection for all Counselor endpoints
router.use(protect, authorize(ROLES.COUNSELOR, ROLES.ADMIN));

/**
 * @route   GET /api/counselor/dashboard
 * @desc    Get real-time database calculated metrics, summary indicators, & conversion funnel
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const counselorFilter = req.user.role === ROLES.COUNSELOR
      ? { $or: [{ assignedCounselor: req.user._id }, { assignedCounselor: null }, { assignedCounselor: { $exists: false } }] }
      : {};

    const [
      totalStudents,
      totalLeads,
      totalApplications,
      pendingDocuments,
      pendingVerifications,
      pendingPayments,
      escalatedCases,
      completedAdmissions,
      totalEnrollments,
      totalAiActions,
      totalCounselorDecisions,
      assignedStudentsRaw,
    ] = await Promise.all([
      Student.countDocuments(),
      Lead.countDocuments(),
      Application.countDocuments(),
      Document.countDocuments({ status: { $in: [DOCUMENT_STATUS.NOT_UPLOADED, DOCUMENT_STATUS.REJECTED] } }),
      Document.countDocuments({ status: { $in: [DOCUMENT_STATUS.PROCESSING, DOCUMENT_STATUS.NEEDS_REVIEW, DOCUMENT_STATUS.MISMATCH] } }),
      Payment.countDocuments({ status: PAYMENT_STATUS.PENDING }),
      CounselorCase.countDocuments({ status: { $in: [COUNSELOR_CASE_STATUS.OPEN, COUNSELOR_CASE_STATUS.IN_PROGRESS] } }),
      Admission.countDocuments({ status: 'APPROVED' }),
      Enrollment.countDocuments(),
      AIAction.countDocuments(),
      CounselorCase.countDocuments({ status: COUNSELOR_CASE_STATUS.RESOLVED }),
      Student.find(counselorFilter).populate('selectedProgram currentApplication').lean(),
    ]);

    // Calculate real conversion rates from database counts
    const leadToAppConversion = totalLeads > 0 ? Math.round((totalApplications / totalLeads) * 100) : 0;
    const appToEnrollConversion = totalApplications > 0 ? Math.round((totalEnrollments / totalApplications) * 100) : 0;
    
    // AI automation percentage calculation
    const totalOperations = totalAiActions + totalCounselorDecisions;
    const aiAutomationRate = totalOperations > 0 ? Math.round((totalAiActions / totalOperations) * 100) : 100;
    const counselorInterventionRate = 100 - aiAutomationRate;

    // Calculate intelligence summary metrics across assigned students
    const intelligentAssigned = await Promise.all(
      assignedStudentsRaw.map((s) => calculateStudentIntelligence(s))
    );

    const highPriorityCount = intelligentAssigned.filter((s) => s.priority === 'HIGH').length;
    const mediumPriorityCount = intelligentAssigned.filter((s) => s.priority === 'MEDIUM').length;
    const lowPriorityCount = intelligentAssigned.filter((s) => s.priority === 'LOW').length;
    const totalScore = intelligentAssigned.reduce((acc, s) => acc + (s.engagementScore || 0), 0);
    const totalReg = intelligentAssigned.reduce((acc, s) => acc + (s.registrationProgress || 0), 0);
    const avgEngagement = intelligentAssigned.length > 0 ? Math.round(totalScore / intelligentAssigned.length) : 0;
    const avgRegistrationProgress = intelligentAssigned.length > 0 ? Math.round(totalReg / intelligentAssigned.length) : 0;

    // Recent cases
    const recentCases = await CounselorCase.find({ status: COUNSELOR_CASE_STATUS.OPEN })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('student');

    return sendSuccess(res, {
      metrics: {
        totalStudents,
        totalLeads,
        totalApplications,
        pendingDocuments,
        pendingVerifications,
        pendingPayments,
        escalatedCases,
        completedAdmissions,
        totalEnrollments,
        leadToAppConversion,
        appToEnrollConversion,
        aiAutomationRate,
        counselorInterventionRate,
        // Summary Indicators for Counselor Intelligence
        assignedStudentsCount: intelligentAssigned.length,
        highPriorityCount,
        mediumPriorityCount,
        lowPriorityCount,
        avgEngagement,
        avgRegistrationProgress,
      },
      recentCases,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/counselor/assigned-students
 * @desc    List all assigned students enriched with 4 intelligence metrics & sorting
 */
router.get('/assigned-students', async (req, res, next) => {
  try {
    const { sortBy = 'priority' } = req.query;
    const isCounselor = req.user.role === ROLES.COUNSELOR;
    const filter = isCounselor
      ? { $or: [{ assignedCounselor: req.user._id }, { assignedCounselor: null }, { assignedCounselor: { $exists: false } }] }
      : {};

    const students = await Student.find(filter)
      .populate('selectedProgram currentApplication persona')
      .lean();

    // Calculate intelligence metrics for each student in parallel from 100% real DB data
    const enrichedStudents = await Promise.all(
      students.map((student) => calculateStudentIntelligence(student))
    );

    // Apply sorting
    enrichedStudents.sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        const diff = (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1);
        if (diff !== 0) return diff;
        return (b.engagementScore || 0) - (a.engagementScore || 0);
      }
      if (sortBy === 'engagement') {
        return (b.engagementScore || 0) - (a.engagementScore || 0);
      }
      if (sortBy === 'registration') {
        return (a.registrationProgress || 0) - (b.registrationProgress || 0);
      }
      if (sortBy === 'visits') {
        return (b.visitCount || 0) - (a.visitCount || 0);
      }
      if (sortBy === 'activity') {
        return new Date(b.lastActivityAt || 0) - new Date(a.lastActivityAt || 0);
      }
      return 0;
    });

    return sendSuccess(res, enrichedStudents);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/counselor/search
 * @desc    Universal Search by Tracking ID, Enrollment Number, Application ID, Email, Phone, Name
 */
router.get('/search', protect, async (req, res, next) => {
  try {
    const { q } = req.query;
    let studentFilter = {};
    let appFilter = {};
    let enrollFilter = {};

    if (q && q.trim()) {
      const query = q.trim();
      const regex = new RegExp(query, 'i');
      studentFilter = {
        $or: [
          { trackingId: regex },
          { officialEnrollmentNumber: regex },
          { email: regex },
          { phone: regex },
          { firstName: regex },
          { lastName: regex },
        ],
      };
      appFilter = {
        $or: [{ applicationId: regex }, { 'personalDetails.fullName': regex }],
      };
      enrollFilter = {
        enrollmentNumber: regex,
      };
    }

    // 1. Search directly in Student & enrich with intelligence metrics
    const rawStudents = await Student.find(studentFilter)
      .populate('selectedProgram currentApplication persona')
      .sort({ updatedAt: -1 })
      .limit(30)
      .lean();

    const students = await Promise.all(
      rawStudents.map((s) => calculateStudentIntelligence(s))
    );

    // 2. Search in Applications
    const applications = Object.keys(appFilter).length > 0 ? await Application.find(appFilter).populate('student program').limit(20) : [];

    // 3. Search in Enrollments
    const enrollments = Object.keys(enrollFilter).length > 0 ? await Enrollment.find(enrollFilter).populate('student program application').limit(20) : [];

    return sendSuccess(res, {
      students,
      applications,
      enrollments,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/counselor/students/:trackingId
 * @desc    Retrieve Complete Authorized 360° Student Lifecycle Record
 */
router.get('/students/:trackingId', protect, async (req, res, next) => {
  try {
    const { trackingId } = req.params;

    const student = await Student.findOne({ trackingId })
      .populate('selectedProgram currentApplication persona');

    if (!student) {
      return sendError(res, `Student with Tracking ID ${trackingId} not found`, 404, 'NOT_FOUND');
    }

    const [
      application,
      documents,
      verifications,
      payments,
      admission,
      enrollment,
      cases,
      conversations,
      timelineLogs,
      aiActions,
    ] = await Promise.all([
      Application.findOne({ student: student._id }).populate('program'),
      Document.find({ student: student._id }).populate('currentVersion'),
      DocumentVerification.find({ student: student._id }).populate('document documentVersion'),
      Payment.find({ student: student._id }).sort({ createdAt: -1 }),
      Admission.findOne({ student: student._id }).populate('program'),
      Enrollment.findOne({ student: student._id }).populate('program'),
      CounselorCase.find({ student: student._id }).sort({ createdAt: -1 }),
      Conversation.find({ student: student._id }),
      AuditLog.find({ trackingId }).sort({ timestamp: 1 }),
      AIAction.find({ trackingId }).sort({ executedAt: -1 }),
    ]);

    return sendSuccess(res, {
      student,
      application,
      documents,
      verifications,
      payments,
      admission,
      enrollment,
      cases,
      conversations,
      timelineLogs,
      aiActions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/counselor/cases
 * @desc    Get all counselor cases with filtering
 */
router.get('/cases', protect, async (req, res, next) => {
  try {
    const { status, category, priority } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const cases = await CounselorCase.find(filter)
      .populate('student application assignedCounselor')
      .sort({ createdAt: -1 });

    return sendSuccess(res, cases);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/counselor/cases/:id
 * @desc    Get single counselor case details with conversation transcript
 */
router.get('/cases/:id', protect, async (req, res, next) => {
  try {
    const counselorCase = await CounselorCase.findById(req.params.id)
      .populate('student application assignedCounselor');

    if (!counselorCase) {
      return sendError(res, 'Counselor case not found', 404, 'NOT_FOUND');
    }

    // Load recent conversation messages
    const messages = await Message.find({ student: counselorCase.student?._id })
      .sort({ createdAt: -1 })
      .limit(20);

    return sendSuccess(res, {
      case: counselorCase,
      recentMessages: messages.reverse(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/counselor/cases/:id/resolve
 * @desc    Resolve case (Approve exception, fee waiver, resolve ambiguity)
 */
router.post('/cases/:id/resolve', protect, authorize(ROLES.COUNSELOR, ROLES.ADMIN), async (req, res, next) => {
  try {
    const { resolutionDecision, resolutionNotes } = req.body;
    const counselorCase = await CounselorCase.findById(req.params.id).populate('student application');

    if (!counselorCase) {
      return sendError(res, 'Case not found', 404, 'NOT_FOUND');
    }

    counselorCase.status = COUNSELOR_CASE_STATUS.RESOLVED;
    counselorCase.resolutionDecision = resolutionDecision || 'RESOLVED';
    counselorCase.resolutionNotes = resolutionNotes || 'Resolved by counselor';
    counselorCase.resolvedAt = new Date();
    counselorCase.assignedCounselor = req.user._id;
    await counselorCase.save();

    // If fee waiver approved, update Application & Student
    if (resolutionDecision === 'APPROVED_FEE_WAIVER' && counselorCase.student) {
      const app = counselorCase.application || await Application.findOne({ student: counselorCase.student._id });
      if (app) {
        app.isFeeWaiverApproved = true;
        app.isPaymentRequired = false;
        await app.save();
      }

      await Student.findByIdAndUpdate(counselorCase.student._id, {
        isSpecialFeeWaiverRequested: false,
      });

      // Advance stage to ADMISSION_REVIEW if currently in DOCUMENTS_PENDING / DOCUMENT_VERIFICATION
      try {
        await transitionStudentStage({
          studentId: counselorCase.student._id,
          targetStage: LIFECYCLE_STAGES.ADMISSION_REVIEW,
          actorId: req.user._id,
          actorType: 'COUNSELOR',
          reason: `Fee waiver granted by admissions counselor. Notes: ${resolutionNotes}`,
        });
      } catch (stageErr) {
        console.warn(`Stage transition note: ${stageErr.message}`);
      }
    } else if (resolutionDecision === 'APPROVED_EXCEPTION' && counselorCase.category === COUNSELOR_CASE_CATEGORY.DOCUMENT_AMBIGUITY) {
      // Approve any pending / needs review documents
      await Document.updateMany(
        { student: counselorCase.student?._id, status: { $in: [DOCUMENT_STATUS.PROCESSING, DOCUMENT_STATUS.NEEDS_REVIEW, DOCUMENT_STATUS.MISMATCH] } },
        { $set: { status: DOCUMENT_STATUS.VERIFIED, verificationNotes: `Approved by counselor exception: ${resolutionNotes}` } }
      );
    }

    emitToCounselors('case:resolved', {
      caseId: counselorCase.caseId,
      trackingId: counselorCase.trackingId,
      decision: resolutionDecision,
    });

    await dispatchEvent(EVENTS.COUNSELLOR_FOLLOWUP_COMPLETED, {
      actorId: req.user._id,
      actorType: req.user.role,
      studentId: counselorCase.student?._id,
      trackingId: counselorCase.trackingId,
      metadata: {
        caseId: counselorCase.caseId,
        decision: resolutionDecision,
        notes: resolutionNotes,
      },
      notificationData: {
        type: 'IN_APP',
        title: 'Counselor Review Decision',
        content: `Your inquiry/case (${counselorCase.caseId}) has been resolved by our admissions team: ${resolutionNotes}`,
        recipient: counselorCase.student?.email,
      },
    });

    return sendSuccess(res, counselorCase, 'Case resolved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/counselor/documents/:id/verify-override
 * @desc    Counselor manual verification decision (APPROVE / REJECT)
 */
router.post('/documents/:id/verify-override', protect, async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const document = await Document.findById(req.params.id).populate('student');

    if (!document) {
      return sendError(res, 'Document not found', 404, 'NOT_FOUND');
    }

    document.status = status; // VERIFIED or REJECTED
    await document.save();

    if (document.currentVersion) {
      await DocumentVerification.findOneAndUpdate(
        { documentVersion: document.currentVersion },
        {
          $set: {
            status,
            verificationEngine: 'MANUAL_COUNSELOR',
            verifiedBy: `${req.user.name || 'Counselor'} (${req.user.role || 'STAFF'})`,
            verifiedAt: new Date(),
            counselorNotes: notes || 'Manual verification decision by counselor',
          },
          $setOnInsert: {
            document: document._id,
            student: document.student?._id || document.student,
          },
        },
        { upsert: true }
      );
    }

    if (document.student) {
      const eventType = status === 'VERIFIED' ? EVENTS.DOCUMENT_VERIFIED : EVENTS.DOCUMENT_REJECTED;
      await dispatchEvent(eventType, {
        actorId: req.user._id,
        actorType: req.user.role || 'COUNSELOR',
        studentId: document.student._id || document.student,
        trackingId: document.trackingId,
        metadata: { documentType: document.documentType, status, notes },
        notificationData: {
          type: 'IN_APP',
          title: `Document ${status === 'VERIFIED' ? 'Verified' : 'Verification Update'}`,
          content: `Your ${document.documentType} was marked as ${status}. ${notes ? `Notes: ${notes}` : ''}`,
          recipient: document.student.email,
        },
      });

      emitToStudent(document.trackingId, 'document:status', {
        documentId: document._id,
        documentType: document.documentType,
        status,
        counselorNotes: notes,
      });
    }

    return sendSuccess(res, document, `Document successfully marked as ${status}`);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/counselor/students/:trackingId/log-email
 * @desc    Log email sent event in AuditLog
 */
router.post('/students/:trackingId/log-email', protect, async (req, res, next) => {
  try {
    const { trackingId } = req.params;
    const { recipientEmail, subject } = req.body;
    const student = await Student.findOne({ trackingId });

    if (student) {
      await dispatchEvent(EVENTS.EMAIL_SENT, {
        actorId: req.user._id,
        actorType: req.user.role || 'COUNSELOR',
        studentId: student._id,
        trackingId,
        metadata: {
          recipientEmail,
          subject,
          description: `📧 Email sent to ${recipientEmail}`,
        },
      });
    }
    return sendSuccess(res, null, 'Email activity logged');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
