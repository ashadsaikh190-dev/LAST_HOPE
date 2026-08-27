const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Document = require('../models/Document');
const Admission = require('../models/Admission');
const Payment = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const CounselorCase = require('../models/CounselorCase');
const Program = require('../models/Program');
const AuditLog = require('../models/AuditLog');
const Workflow = require('../models/Workflow');
const SystemError = require('../models/SystemError');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { ROLES, LIFECYCLE_STAGES, ADMISSION_STATUS, DOCUMENT_STATUS } = require('../config/constants');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// Enforce authentication & role protection for all Admin endpoints
router.use(protect, authorize(ROLES.ADMIN));

/**
 * @route   GET /api/admin/overview
 * @desc    Centralized Institutional Command Center KPIs & Real-Data Funnel
 */
router.get('/overview', async (req, res, next) => {
  try {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    const [
      totalStudents,
      activeApplications,
      totalAdmissions,
      activeCounselorsCount,
      pendingScholarships,
      pendingAdmissionForms,
      pendingDocuments,
      atRiskStudentsCount,
      registeredCount,
      appStartedCount,
      appCompletedCount,
      docsSubmittedCount,
      docsVerifiedCount,
      offersCount,
      paymentsCount,
      enrolledCount,
      recentActivities,
    ] = await Promise.all([
      Student.countDocuments(),
      Application.countDocuments({
        status: {
          $in: [
            LIFECYCLE_STAGES.APPLICATION_STARTED,
            LIFECYCLE_STAGES.APPLICATION_COMPLETED,
            LIFECYCLE_STAGES.DOCUMENTS_PENDING,
            LIFECYCLE_STAGES.DOCUMENT_VERIFICATION,
            LIFECYCLE_STAGES.ELIGIBILITY_CHECK,
            LIFECYCLE_STAGES.PAYMENT_PENDING,
            LIFECYCLE_STAGES.ADMISSION_REVIEW,
          ],
        },
      }),
      Admission.countDocuments({ status: ADMISSION_STATUS.APPROVED }),
      User.countDocuments({ role: ROLES.COUNSELOR, isActive: true }),
      Admission.countDocuments({ status: ADMISSION_STATUS.PENDING_REVIEW }),
      Application.countDocuments({
        status: {
          $in: [
            LIFECYCLE_STAGES.APPLICATION_COMPLETED,
            LIFECYCLE_STAGES.DOCUMENT_VERIFICATION,
            LIFECYCLE_STAGES.ADMISSION_REVIEW,
          ],
        },
      }),
      Document.countDocuments({
        status: {
          $in: [
            DOCUMENT_STATUS.PROCESSING,
            DOCUMENT_STATUS.NEEDS_REVIEW,
            DOCUMENT_STATUS.MISMATCH,
          ],
        },
      }),
      Student.countDocuments({
        $or: [
          { lastActivityAt: { $lt: fiveDaysAgo } },
          { updatedAt: { $lt: fiveDaysAgo }, currentStage: { $nin: [LIFECYCLE_STAGES.ENROLLED] } },
          { currentStage: { $in: [LIFECYCLE_STAGES.DOCUMENTS_PENDING, LIFECYCLE_STAGES.PAYMENT_PENDING] } },
        ],
      }),
      // Funnel Stages (Real Counts)
      Student.countDocuments(),
      Application.countDocuments(),
      Application.countDocuments({ status: { $ne: LIFECYCLE_STAGES.APPLICATION_STARTED } }),
      Document.countDocuments({ status: { $ne: DOCUMENT_STATUS.NOT_UPLOADED } }),
      Document.countDocuments({ status: DOCUMENT_STATUS.VERIFIED }),
      Admission.countDocuments(),
      Payment.countDocuments({ status: 'SUCCESS' }),
      Student.countDocuments({ currentStage: LIFECYCLE_STAGES.ENROLLED }),
      AuditLog.find().sort({ timestamp: -1 }).limit(8).lean(),
    ]);

    const pendingApprovalsTotal = pendingScholarships + pendingAdmissionForms + pendingDocuments;

    return sendSuccess(res, {
      kpis: {
        totalStudents,
        activeApplications,
        totalAdmissions,
        pendingApprovals: pendingApprovalsTotal,
        pendingBreakdown: {
          scholarships: pendingScholarships,
          admissionForms: pendingAdmissionForms,
          documents: pendingDocuments,
        },
        atRiskStudents: atRiskStudentsCount,
        activeCounselors: activeCounselorsCount,
      },
      funnel: [
        { stage: 'Registered', count: registeredCount, dropOffPct: 0 },
        {
          stage: 'Application Started',
          count: appStartedCount,
          dropOffPct: registeredCount > 0 ? Math.max(0, Math.round(((registeredCount - appStartedCount) / registeredCount) * 100)) : 0,
        },
        {
          stage: 'Application Completed',
          count: appCompletedCount,
          dropOffPct: appStartedCount > 0 ? Math.max(0, Math.round(((appStartedCount - appCompletedCount) / appStartedCount) * 100)) : 0,
        },
        {
          stage: 'Documents Submitted',
          count: docsSubmittedCount,
          dropOffPct: appCompletedCount > 0 ? Math.max(0, Math.round(((appCompletedCount - docsSubmittedCount) / appCompletedCount) * 100)) : 0,
        },
        {
          stage: 'Documents Verified',
          count: docsVerifiedCount,
          dropOffPct: docsSubmittedCount > 0 ? Math.max(0, Math.round(((docsSubmittedCount - docsVerifiedCount) / docsSubmittedCount) * 100)) : 0,
        },
        {
          stage: 'Offer Generated',
          count: offersCount,
          dropOffPct: docsVerifiedCount > 0 ? Math.max(0, Math.round(((docsVerifiedCount - offersCount) / docsVerifiedCount) * 100)) : 0,
        },
        {
          stage: 'Payment Completed',
          count: paymentsCount,
          dropOffPct: offersCount > 0 ? Math.max(0, Math.round(((offersCount - paymentsCount) / offersCount) * 100)) : 0,
        },
        {
          stage: 'Admission Completed / Enrolled',
          count: enrolledCount,
          dropOffPct: paymentsCount > 0 ? Math.max(0, Math.round(((paymentsCount - enrolledCount) / paymentsCount) * 100)) : 0,
        },
      ],
      recentActivities,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/counselors
 * @desc    Get all counselors ranked by multi-factor performance score
 */
router.get('/counselors', async (req, res, next) => {
  try {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const counselors = await User.find({ role: ROLES.COUNSELOR }).lean();

    const counselorsWithMetrics = await Promise.all(
      counselors.map(async (counselor) => {
        // Query real assigned students
        const assignedStudents = await Student.find({
          $or: [{ assignedCounselor: counselor._id }],
        }).select('_id currentStage lastActivityAt lastCounselorInteractionAt trackingId');

        const assignedCount = assignedStudents.length;
        const studentIds = assignedStudents.map((s) => s._id);

        const [
          completedApps,
          completedAdmissions,
          pendingCases,
          resolvedCases,
        ] = await Promise.all([
          Application.countDocuments({
            student: { $in: studentIds },
            status: { $ne: LIFECYCLE_STAGES.APPLICATION_STARTED },
          }),
          Admission.countDocuments({
            student: { $in: studentIds },
            status: ADMISSION_STATUS.APPROVED,
          }),
          CounselorCase.countDocuments({
            $or: [{ assignedCounselor: counselor._id }, { student: { $in: studentIds } }],
            status: { $in: ['OPEN', 'IN_PROGRESS'] },
          }),
          CounselorCase.countDocuments({
            $or: [{ assignedCounselor: counselor._id }, { student: { $in: studentIds } }],
            status: 'RESOLVED',
          }),
        ]);

        // Calculate At-Risk Students for this counselor
        const atRiskCount = assignedStudents.filter((s) => {
          const isInactive = s.lastActivityAt && new Date(s.lastActivityAt) < fiveDaysAgo;
          const isPending = [LIFECYCLE_STAGES.DOCUMENTS_PENDING, LIFECYCLE_STAGES.PAYMENT_PENDING].includes(s.currentStage);
          return isInactive || isPending;
        }).length;

        // Calculate Conversion Rate
        const conversionRate = assignedCount > 0 ? Math.round((completedAdmissions / assignedCount) * 100) : 0;
        const appCompletionRate = assignedCount > 0 ? Math.round((completedApps / assignedCount) * 100) : 0;
        const totalCases = pendingCases + resolvedCases;
        const followupCompletionRate = totalCases > 0 ? Math.round((resolvedCases / totalCases) * 100) : 100;
        const activeStudentRate = assignedCount > 0 ? Math.round(((assignedCount - atRiskCount) / assignedCount) * 100) : 100;

        // Weighted Performance Score Calculation
        // 30% Conversion + 20% Follow-up + 20% Active Students + 15% App Completion + 15% Case Resolution
        const performanceScore = Math.round(
          conversionRate * 0.3 +
          followupCompletionRate * 0.2 +
          activeStudentRate * 0.2 +
          appCompletionRate * 0.15 +
          (totalCases > 0 ? (resolvedCases / totalCases) * 100 * 0.15 : 15)
        );

        return {
          ...counselor,
          assignedCount,
          applicationsCount: completedApps,
          admissionsCount: completedAdmissions,
          conversionRate,
          appCompletionRate,
          followupRate: followupCompletionRate,
          pendingFollowups: pendingCases,
          atRiskCount,
          performanceScore,
        };
      })
    );

    // Rank High to Low
    counselorsWithMetrics.sort((a, b) => b.performanceScore - a.performanceScore);

    const rankedCounselors = counselorsWithMetrics.map((c, index) => ({
      ...c,
      rank: index + 1,
    }));

    return sendSuccess(res, rankedCounselors);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/counselors/:id
 * @desc    Get detailed counselor metrics and their assigned students
 */
router.get('/counselors/:id', async (req, res, next) => {
  try {
    const counselor = await User.findById(req.params.id).select('-password').lean();
    if (!counselor || counselor.role !== ROLES.COUNSELOR) {
      return sendError(res, 'Counselor not found', 404, 'NOT_FOUND');
    }

    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    const assignedStudents = await Student.find({ assignedCounselor: counselor._id })
      .populate('selectedProgram currentApplication persona')
      .sort({ updatedAt: -1 })
      .lean();

    const studentIds = assignedStudents.map((s) => s._id);

    const [admissionsCount, applicationsCount, cases] = await Promise.all([
      Admission.countDocuments({ student: { $in: studentIds }, status: ADMISSION_STATUS.APPROVED }),
      Application.countDocuments({ student: { $in: studentIds } }),
      CounselorCase.find({
        $or: [{ assignedCounselor: counselor._id }, { student: { $in: studentIds } }],
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const studentsWithRisk = assignedStudents.map((s) => {
      const isInactive = s.lastActivityAt && new Date(s.lastActivityAt) < fiveDaysAgo;
      const isOverdueFollowup =
        s.lastActivityAt &&
        new Date(s.lastActivityAt) > fiveDaysAgo &&
        (!s.lastCounselorInteractionAt || new Date(s.lastCounselorInteractionAt) < fiveDaysAgo);

      let riskLevel = 'LOW';
      let riskReason = 'Student progressing normally';

      if (isOverdueFollowup) {
        riskLevel = 'HIGH';
        riskReason = 'Counselor follow-up overdue (> 5 days)';
      } else if (isInactive) {
        riskLevel = 'MEDIUM';
        riskReason = 'No student activity for > 5 days';
      } else if (s.currentStage === LIFECYCLE_STAGES.DOCUMENTS_PENDING) {
        riskLevel = 'MEDIUM';
        riskReason = 'Pending document upload';
      }

      return {
        ...s,
        riskLevel,
        riskReason,
      };
    });

    const conversionRate =
      assignedStudents.length > 0 ? Math.round((admissionsCount / assignedStudents.length) * 100) : 0;

    return sendSuccess(res, {
      counselor,
      metrics: {
        assignedCount: assignedStudents.length,
        applicationsCount,
        admissionsCount,
        conversionRate,
        atRiskCount: studentsWithRisk.filter((s) => s.riskLevel !== 'LOW').length,
        pendingCases: cases.filter((c) => c.status === 'OPEN').length,
      },
      students: studentsWithRisk,
      cases,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/admin/counselors/:id
 * @desc    Update counselor details or activate/deactivate
 */
router.put('/counselors/:id', async (req, res, next) => {
  try {
    const { name, email, phone, isActive } = req.body;
    const counselor = await User.findById(req.params.id);

    if (!counselor || counselor.role !== ROLES.COUNSELOR) {
      return sendError(res, 'Counselor not found', 404, 'NOT_FOUND');
    }

    if (name) counselor.name = name;
    if (email) counselor.email = email.toLowerCase();
    if (phone !== undefined) counselor.phone = phone;
    if (isActive !== undefined) counselor.isActive = Boolean(isActive);

    await counselor.save();

    await logAudit({
      actorId: req.user._id,
      actorType: 'ADMIN',
      action: 'COUNSELOR_UPDATED',
      metadata: { counselorId: counselor._id, name: counselor.name, isActive: counselor.isActive },
    });

    return sendSuccess(res, counselor, 'Counselor updated successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/students
 * @desc    List all students with lifecycle stage, risk status, and counselor assignment
 */
router.get('/students', async (req, res, next) => {
  try {
    const { stage, risk, counselorId, q, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (stage) filter.currentStage = stage;
    if (counselorId) filter.assignedCounselor = counselorId;

    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { trackingId: regex },
        { officialEnrollmentNumber: regex },
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [students, total] = await Promise.all([
      Student.find(filter)
        .populate('selectedProgram currentApplication assignedCounselor')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Student.countDocuments(filter),
    ]);

    const enrichedStudents = students.map((s) => {
      const isInactive = s.lastActivityAt && new Date(s.lastActivityAt) < fiveDaysAgo;
      const isOverdue =
        s.lastActivityAt &&
        new Date(s.lastActivityAt) > fiveDaysAgo &&
        (!s.lastCounselorInteractionAt || new Date(s.lastCounselorInteractionAt) < fiveDaysAgo);

      let riskLevel = 'LOW';
      let riskReason = 'Active & On Track';

      if (isOverdue) {
        riskLevel = 'HIGH';
        riskReason = 'Counselor follow-up overdue (> 5 days)';
      } else if (isInactive) {
        riskLevel = 'MEDIUM';
        riskReason = 'No student activity for > 5 days';
      } else if (s.currentStage === LIFECYCLE_STAGES.DOCUMENTS_PENDING) {
        riskLevel = 'MEDIUM';
        riskReason = 'Document submission pending';
      } else if (s.currentStage === LIFECYCLE_STAGES.PAYMENT_PENDING) {
        riskLevel = 'MEDIUM';
        riskReason = 'Tuition payment pending';
      }

      return {
        ...s,
        riskLevel,
        riskReason,
      };
    });

    const filteredByRisk = risk
      ? enrichedStudents.filter((s) => s.riskLevel === risk)
      : enrichedStudents;

    return sendSuccess(res, {
      students: filteredByRisk,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/admin/students/:trackingId/reassign
 * @desc    Reassign a student to another counselor
 */
router.post('/students/:trackingId/reassign', async (req, res, next) => {
  try {
    const { trackingId } = req.params;
    const { counselorId, reason } = req.body;

    if (!counselorId) {
      return sendError(res, 'Counselor ID is required', 400, 'VALIDATION_ERROR');
    }

    const [student, newCounselor] = await Promise.all([
      Student.findOne({ trackingId }).populate('assignedCounselor'),
      User.findById(counselorId),
    ]);

    if (!student) {
      return sendError(res, 'Student not found', 404, 'NOT_FOUND');
    }

    if (!newCounselor || newCounselor.role !== ROLES.COUNSELOR) {
      return sendError(res, 'Invalid counselor specified', 400, 'INVALID_COUNSELOR');
    }

    const previousCounselorName = student.assignedCounselor?.name || 'Unassigned';
    student.assignedCounselor = newCounselor._id;
    await student.save();

    await logAudit({
      actorId: req.user._id,
      actorType: 'ADMIN',
      studentId: student._id,
      trackingId: student.trackingId,
      action: 'STUDENT_REASSIGNED',
      metadata: {
        previousCounselor: previousCounselorName,
        newCounselor: newCounselor.name,
        reason: reason || 'Reassigned by admissions administrator',
      },
    });

    await createNotification({
      studentId: student._id,
      trackingId: student.trackingId,
      type: 'IN_APP',
      title: 'Counselor Reassigned',
      content: `Your admissions advisor has been updated to ${newCounselor.name}.`,
      recipient: student.email,
    });

    return sendSuccess(
      res,
      {
        trackingId: student.trackingId,
        assignedCounselor: { id: newCounselor._id, name: newCounselor.name, email: newCounselor.email },
      },
      `Student ${student.firstName} reassigned to ${newCounselor.name} successfully.`
    );
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/at-risk-students
 * @desc    Query all at-risk students with specific drop-off triggers
 */
router.get('/at-risk-students', async (req, res, next) => {
  try {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    const students = await Student.find({
      currentStage: { $ne: LIFECYCLE_STAGES.ENROLLED },
    })
      .populate('selectedProgram currentApplication assignedCounselor')
      .sort({ updatedAt: -1 })
      .lean();

    const atRiskList = [];

    for (const student of students) {
      const isInactive = student.lastActivityAt && new Date(student.lastActivityAt) < fiveDaysAgo;
      const isOverdueFollowup =
        student.lastActivityAt &&
        new Date(student.lastActivityAt) > fiveDaysAgo &&
        (!student.lastCounselorInteractionAt || new Date(student.lastCounselorInteractionAt) < fiveDaysAgo);

      let isAtRisk = false;
      let riskType = '';
      let riskDetails = '';

      if (isOverdueFollowup) {
        isAtRisk = true;
        riskType = 'FOLLOWUP_OVERDUE';
        riskDetails = 'Student is active, but counselor interaction is overdue (> 5 days)';
      } else if (isInactive) {
        isAtRisk = true;
        riskType = 'STUDENT_INACTIVE';
        riskDetails = 'No candidate activity logged for more than 5 days';
      } else if (student.currentStage === LIFECYCLE_STAGES.DOCUMENTS_PENDING) {
        isAtRisk = true;
        riskType = 'DOCUMENTS_PENDING';
        riskDetails = 'Mandatory admission certificates not uploaded';
      } else if (student.currentStage === LIFECYCLE_STAGES.PAYMENT_PENDING) {
        isAtRisk = true;
        riskType = 'PAYMENT_PENDING';
        riskDetails = 'Admission offer acceptance fee pending';
      }

      if (isAtRisk) {
        atRiskList.push({
          ...student,
          riskType,
          riskDetails,
          lastStudentActivity: student.lastActivityAt || student.updatedAt,
          lastCounselorInteraction: student.lastCounselorInteractionAt || null,
        });
      }
    }

    return sendSuccess(res, atRiskList);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/admin/students/:trackingId/remind-counselor
 * @desc    Dispatch priority reminder notification to assigned counselor
 */
router.post('/students/:trackingId/remind-counselor', async (req, res, next) => {
  try {
    const { trackingId } = req.params;
    const { notes } = req.body;

    const student = await Student.findOne({ trackingId }).populate('assignedCounselor');
    if (!student) {
      return sendError(res, 'Student not found', 404, 'NOT_FOUND');
    }

    if (!student.assignedCounselor) {
      return sendError(res, 'Student has no assigned counselor', 400, 'NO_COUNSELOR');
    }

    // Create an escalation case / notification for the counselor
    await CounselorCase.create({
      caseId: `CASE-ADMIN-${Date.now().toString().slice(-6)}`,
      student: student._id,
      trackingId: student.trackingId,
      priority: 'HIGH',
      category: 'HUMAN_REQUEST',
      summary: `Admin Follow-up Reminder: Student ${student.firstName} ${student.lastName}`,
      aiReason: notes || 'Admin flagged candidate as at-risk due to overdue follow-up or stall.',
      recommendedAction: 'Contact student directly via email/phone and update status.',
      assignedCounselor: student.assignedCounselor._id,
    });

    await logAudit({
      actorId: req.user._id,
      actorType: 'ADMIN',
      studentId: student._id,
      trackingId: student.trackingId,
      action: 'COUNSELOR_REMINDER_SENT',
      metadata: { counselorName: student.assignedCounselor.name, notes },
    });

    return sendSuccess(
      res,
      null,
      `Priority follow-up reminder sent to counselor ${student.assignedCounselor.name}.`
    );
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/approvals
 * @desc    Centralized queue of pending approval requests
 */
router.get('/approvals', async (req, res, next) => {
  try {
    const [scholarships, admissionForms, documents] = await Promise.all([
      Admission.find({ status: ADMISSION_STATUS.PENDING_REVIEW })
        .populate({
          path: 'student',
          populate: { path: 'assignedCounselor selectedProgram' },
        })
        .populate('program application')
        .sort({ createdAt: -1 })
        .lean(),
      Application.find({
        status: {
          $in: [
            LIFECYCLE_STAGES.APPLICATION_COMPLETED,
            LIFECYCLE_STAGES.ADMISSION_REVIEW,
          ],
        },
      })
        .populate({
          path: 'student',
          populate: { path: 'assignedCounselor' },
        })
        .populate('program')
        .sort({ updatedAt: -1 })
        .lean(),
      Document.find({
        status: { $in: [DOCUMENT_STATUS.NEEDS_REVIEW, DOCUMENT_STATUS.MISMATCH] },
      })
        .populate({
          path: 'student',
          populate: { path: 'assignedCounselor' },
        })
        .sort({ updatedAt: -1 })
        .lean(),
    ]);

    return sendSuccess(res, {
      scholarships,
      admissionForms,
      documents,
      totalPending: scholarships.length + admissionForms.length + documents.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/admin/approvals/:type/:id/decision
 * @desc    Admin reviews and approves/rejects/requests correction on approval item
 */
router.post('/approvals/:type/:id/decision', async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const { decision, reason, scholarshipPct } = req.body; // 'APPROVE', 'REJECT', 'REQUEST_CORRECTION'

    if (!['APPROVE', 'REJECT', 'REQUEST_CORRECTION'].includes(decision)) {
      return sendError(res, 'Decision must be APPROVE, REJECT, or REQUEST_CORRECTION', 400, 'INVALID_DECISION');
    }

    if ((decision === 'REJECT' || decision === 'REQUEST_CORRECTION') && !reason?.trim()) {
      return sendError(res, 'A mandatory reason is required for rejection or correction requests.', 400, 'REASON_REQUIRED');
    }

    let result = null;

    if (type === 'scholarship') {
      const admission = await Admission.findById(id).populate('student application');
      if (!admission) return sendError(res, 'Scholarship record not found', 404, 'NOT_FOUND');

      if (decision === 'APPROVE') {
        admission.status = ADMISSION_STATUS.APPROVED;
        if (scholarshipPct !== undefined) admission.scholarshipPercentage = Number(scholarshipPct);
        admission.decisionNotes = `Scholarship approved by Administrator: ${reason || 'Approved'}`;
        admission.decisionBy = `${req.user.name} (ADMIN)`;
        await admission.save();

        if (admission.student) {
          admission.student.currentStage = LIFECYCLE_STAGES.ADMISSION_APPROVED;
          await admission.student.save();
        }
      } else if (decision === 'REJECT') {
        admission.status = ADMISSION_STATUS.REJECTED;
        admission.decisionNotes = `Scholarship rejected: ${reason}`;
        admission.decisionBy = `${req.user.name} (ADMIN)`;
        await admission.save();
      } else {
        admission.status = ADMISSION_STATUS.PENDING_REVIEW;
        admission.decisionNotes = `Correction requested: ${reason}`;
        await admission.save();
      }

      result = admission;
    } else if (type === 'admission-form') {
      const application = await Application.findById(id).populate('student program');
      if (!application) return sendError(res, 'Application form not found', 404, 'NOT_FOUND');

      if (decision === 'APPROVE') {
        application.status = LIFECYCLE_STAGES.ADMISSION_APPROVED;
        await application.save();

        if (application.student) {
          application.student.currentStage = LIFECYCLE_STAGES.ADMISSION_APPROVED;
          await application.student.save();
        }
      } else if (decision === 'REJECT') {
        application.status = LIFECYCLE_STAGES.APPLICATION_STARTED;
        await application.save();
      } else {
        application.status = LIFECYCLE_STAGES.APPLICATION_STARTED;
        await application.save();
      }

      result = application;
    } else if (type === 'document') {
      const document = await Document.findById(id).populate('student');
      if (!document) return sendError(res, 'Document not found', 404, 'NOT_FOUND');

      if (decision === 'APPROVE') {
        document.status = DOCUMENT_STATUS.VERIFIED;
      } else if (decision === 'REJECT') {
        document.status = DOCUMENT_STATUS.REJECTED;
      } else {
        document.status = DOCUMENT_STATUS.NEEDS_REVIEW;
      }
      await document.save();
      result = document;
    } else {
      return sendError(res, 'Invalid approval type', 400, 'INVALID_TYPE');
    }

    await logAudit({
      actorId: req.user._id,
      actorType: 'ADMIN',
      action: `ADMIN_APPROVAL_${type.toUpperCase()}_${decision}`,
      metadata: { targetId: id, decision, reason, type },
    });

    return sendSuccess(res, result, `Approval decision [${decision}] recorded successfully.`);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/search
 * @desc    Global Admin Search across Students, Counselors, and Applications
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return sendSuccess(res, { students: [], counselors: [], applications: [] });
    }

    const query = q.trim();
    const regex = new RegExp(query, 'i');

    const [students, counselors, applications] = await Promise.all([
      Student.find({
        $or: [
          { trackingId: regex },
          { officialEnrollmentNumber: regex },
          { firstName: regex },
          { lastName: regex },
          { email: regex },
          { phone: regex },
        ],
      })
        .populate('selectedProgram assignedCounselor')
        .limit(15)
        .lean(),
      User.find({
        role: ROLES.COUNSELOR,
        $or: [{ name: regex }, { email: regex }, { phone: regex }],
      })
        .select('-password')
        .limit(10)
        .lean(),
      Application.find({
        $or: [{ applicationId: regex }, { 'personalDetails.fullName': regex }, { trackingId: regex }],
      })
        .populate('student program')
        .limit(10)
        .lean(),
    ]);

    return sendSuccess(res, { students, counselors, applications });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    List system users (Admins, Counselors)
 */
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return sendSuccess(res, users);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/admin/users
 * @desc    Create Counselor staff user (Single-Admin policy strictly enforced)
 */
router.post('/users', async (req, res, next) => {
  try {
    const { name, email, password, role = ROLES.COUNSELOR, phone } = req.body;

    if (!name || !email || !password) {
      return sendError(res, 'Name, email, and password are required', 400, 'VALIDATION_ERROR');
    }

    // STRICT SINGLE-ADMIN ENFORCEMENT
    if (role === ROLES.ADMIN) {
      const existingAdminCount = await User.countDocuments({ role: ROLES.ADMIN });
      if (existingAdminCount >= 1) {
        return sendError(
          res,
          'Single-Admin Policy Enforced: Only one Administrator account is permitted in the system. Cannot create additional Admin accounts.',
          400,
          'SINGLE_ADMIN_POLICY_VIOLATION'
        );
      }
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return sendError(res, 'User with this email already exists', 400, 'USER_EXISTS');
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.COUNSELOR,
      phone: phone || '',
    });

    await logAudit({
      actorId: req.user._id,
      actorType: 'ADMIN',
      action: 'STAFF_USER_CREATED',
      metadata: { userId: user._id, name: user.name, role: user.role, email: user.email },
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
 * @route   GET /api/admin/audit-logs
 * @desc    Query audit logs with pagination and filters
 */
router.get('/audit-logs', async (req, res, next) => {
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

router.get('/cost-protection', async (req, res, next) => {
  try {
    const state = await getCostProtectionState();
    const recentCostLogs = await AuditLog.find({ action: { $regex: /^AWS_/ } })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    return sendSuccess(res, { state, recentCostLogs });
  } catch (error) {
    next(error);
  }
});

router.post('/cost-protection/simulate', async (req, res, next) => {
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

router.post('/cost-protection/resume', async (req, res, next) => {
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

router.post('/cost-protection/update-thresholds', async (req, res, next) => {
  try {
    const { thresholds, limits } = req.body;
    const updatedState = await updateThresholdsAndLimits({ thresholds, limits });
    return sendSuccess(res, updatedState, 'AWS Cost Protection thresholds updated successfully.');
  } catch (error) {
    next(error);
  }
});

router.post('/cost-protection/trigger-check', async (req, res, next) => {
  try {
    const updatedState = await evaluateProtectionState();
    return sendSuccess(res, updatedState, 'Cost protection evaluation completed.');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
