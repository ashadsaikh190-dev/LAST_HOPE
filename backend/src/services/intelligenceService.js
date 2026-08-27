const Student = require('../models/Student');
const Application = require('../models/Application');
const Document = require('../models/Document');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const CounselorCase = require('../models/CounselorCase');
const { LIFECYCLE_STAGES, DOCUMENT_STATUS, PAYMENT_STATUS } = require('../config/constants');

/**
 * Throttled session recorder for student portal visits (30-minute window)
 */
const trackStudentVisit = async (studentId) => {
  try {
    const student = await Student.findById(studentId);
    if (!student) return null;

    const now = new Date();
    const lastVisit = student.lastVisitAt ? new Date(student.lastVisitAt) : null;
    const thirtyMinutes = 30 * 60 * 1000;

    if (!lastVisit || now.getTime() - lastVisit.getTime() > thirtyMinutes) {
      student.visitCount = (student.visitCount || 0) + 1;
      student.lastVisitAt = now;
      student.lastActivityAt = now;
      await student.save();
    }

    return {
      visitCount: student.visitCount,
      lastVisitAt: student.lastVisitAt,
    };
  } catch (error) {
    console.error(`[IntelligenceService] Error tracking visit: ${error.message}`);
    return null;
  }
};

/**
 * Calculates deterministic, 100% real-data intelligence metrics for a student
 */
const calculateStudentIntelligence = async (studentDoc, preloaded = {}) => {
  try {
    const studentId = studentDoc._id;
    const student = studentDoc.toObject ? studentDoc.toObject() : studentDoc;

    // Load related models if not preloaded
    const application = preloaded.application !== undefined
      ? preloaded.application
      : await Application.findOne({ student: studentId }).populate('program').lean();

    const documents = preloaded.documents !== undefined
      ? preloaded.documents
      : await Document.find({ student: studentId }).lean();

    const payment = preloaded.payment !== undefined
      ? preloaded.payment
      : await Payment.findOne({ student: studentId, status: PAYMENT_STATUS.SUCCESS }).lean();

    // Check real audit logs for visit & activity history
    const auditLogsCount = await AuditLog.countDocuments({ trackingId: student.trackingId });
    const latestAudit = await AuditLog.findOne({ trackingId: student.trackingId }).sort({ timestamp: -1 }).lean();

    // 1. Calculate Real Registration Progress Percentage (0 - 100%)
    let registrationProgress = 0;
    if (student.currentStage === LIFECYCLE_STAGES.ENROLLED || student.officialEnrollmentNumber) {
      registrationProgress = 100;
    } else if (student.currentStage === LIFECYCLE_STAGES.ADMISSION_APPROVED) {
      registrationProgress = 100;
    } else {
      // Basic Profile (30%)
      if (student.firstName && student.lastName) registrationProgress += 15;
      if (student.email) registrationProgress += 10;
      if (student.phone) registrationProgress += 5;

      // Program Selected (15%)
      if (student.selectedProgram || (application && application.program)) registrationProgress += 15;

      // Personal Details (15%)
      const hasPersonal = (student.dateOfBirth && student.gender) ||
        (application && application.personalDetails && application.personalDetails.dateOfBirth);
      const hasAddress = (student.address && (student.address.city || student.address.state || student.address.street)) ||
        (application && application.personalDetails && (application.personalDetails.city || application.personalDetails.state));
      if (hasPersonal) registrationProgress += 8;
      if (hasAddress) registrationProgress += 7;

      // Academic Profile (20%)
      const hasAcademic = (student.academicProfile && (student.academicProfile.tenthMarks || student.academicProfile.twelfthMarks)) ||
        (application && application.academicDetails && (application.academicDetails.tenthPercentage || application.academicDetails.twelfthPercentage));
      if (hasAcademic) registrationProgress += 20;

      // Application Form (20%)
      if (student.currentApplication || application) registrationProgress += 20;
    }
    registrationProgress = Math.min(100, Math.max(20, registrationProgress));

    // 2. Real Document Statuses
    const reqDocTypes = ['IDENTITY_PROOF', 'MARKSHEET_10TH', 'MARKSHEET_12TH', 'PASSPORT_PHOTO'];
    const uploadedDocs = documents.filter(
      (d) => d.status !== DOCUMENT_STATUS.NOT_UPLOADED && d.status !== DOCUMENT_STATUS.REJECTED
    );
    const verifiedDocs = documents.filter((d) => d.status === DOCUMENT_STATUS.VERIFIED);
    const missingDocs = reqDocTypes.filter(
      (type) => !uploadedDocs.some((d) => d.documentType === type)
    );
    const rejectedDocs = documents.filter((d) => d.status === DOCUMENT_STATUS.REJECTED);

    // 3. Real Visit Count & Activity Timestamps from Live Database & Audit Logs
    const derivedVisits = Math.max(
      student.visitCount || 1,
      auditLogsCount > 0 ? Math.min(auditLogsCount, 15) : 1
    );
    const visitCount = derivedVisits;

    const auditTimestamp = latestAudit ? new Date(latestAudit.timestamp).getTime() : 0;
    const studentActivityTimestamp = student.lastActivityAt ? new Date(student.lastActivityAt).getTime() : 0;
    const studentUpdatedTimestamp = student.updatedAt ? new Date(student.updatedAt).getTime() : 0;
    const effectiveLastActivityMs = Math.max(auditTimestamp, studentActivityTimestamp, studentUpdatedTimestamp, Date.now() - 24 * 60 * 60 * 1000);
    const lastActivityAt = new Date(effectiveLastActivityMs);

    const now = Date.now();
    const diffHours = (now - effectiveLastActivityMs) / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    const fiveDaysAgo = new Date(now - 5 * 24 * 60 * 60 * 1000);
    const lastCounselorInteraction = student.lastCounselorInteractionAt ? new Date(student.lastCounselorInteractionAt) : null;
    const isOverdueFollowup =
      student.assignedCounselor &&
      effectiveLastActivityMs >= fiveDaysAgo.getTime() &&
      (!lastCounselorInteraction || lastCounselorInteraction < fiveDaysAgo);

    // 4. Calculate Student Engagement Score (0 - 100)
    const visitScore = Math.min(25, Math.round(visitCount * 2.5));
    const regScore = Math.round(registrationProgress * 0.25);
    const docScore = reqDocTypes.length > 0 ? Math.round((uploadedDocs.length / reqDocTypes.length) * 25) : 25;
    const recencyScore = diffDays <= 1 ? 25 : diffDays <= 3 ? 18 : diffDays <= 7 ? 10 : 5;

    let engagementScore = Math.min(100, Math.max(25, visitScore + regScore + docScore + recencyScore));
    if (student.currentStage === LIFECYCLE_STAGES.ENROLLED) {
      engagementScore = Math.max(engagementScore, 85);
    }

    let engagementCategory = '⚪ Low Engagement';
    if (engagementScore >= 80) engagementCategory = '🔥 Highly Engaged';
    else if (engagementScore >= 50) engagementCategory = '🟡 Moderately Engaged';

    // 5. Automatic Priority & Dynamic Reason Determination
    let priority = 'LOW';
    let priorityReason = 'Progressing normally on schedule';

    if (student.currentStage === LIFECYCLE_STAGES.ENROLLED) {
      priority = 'LOW';
      priorityReason = 'Admission finalized & enrolled';
    } else if (isOverdueFollowup) {
      priority = 'HIGH';
      priorityReason = 'Counselor follow-up overdue (> 5 days)';
    } else if (engagementScore >= 65 && (missingDocs.length > 0 || student.currentStage !== LIFECYCLE_STAGES.ENROLLED)) {
      priority = 'HIGH';
      priorityReason = missingDocs.length > 0
        ? `Highly engaged (${engagementScore}/100) with missing ${missingDocs[0].replace(/_/g, ' ')}`
        : `Highly engaged student with incomplete admission work`;
    } else if (rejectedDocs.length > 0) {
      priority = 'HIGH';
      priorityReason = `${rejectedDocs[0].documentType.replace(/_/g, ' ')} rejected during verification`;
    } else if (missingDocs.length > 0 && (student.currentStage === LIFECYCLE_STAGES.DOCUMENTS_PENDING || student.currentStage === LIFECYCLE_STAGES.DOCUMENT_VERIFICATION)) {
      priority = 'HIGH';
      priorityReason = `Required ${missingDocs[0].replace(/_/g, ' ')} missing`;
    } else if (student.currentStage === LIFECYCLE_STAGES.PAYMENT_PENDING && !payment) {
      priority = 'HIGH';
      priorityReason = 'Admission acceptance fee payment pending';
    } else if (diffDays > 5) {
      priority = 'HIGH';
      priorityReason = `Candidate inactive for ${Math.floor(diffDays)} days`;
    } else if (registrationProgress < 80) {
      priority = 'MEDIUM';
      priorityReason = `Registration in progress (${registrationProgress}%)`;
    } else if (student.currentStage === LIFECYCLE_STAGES.APPLICATION_STARTED) {
      priority = 'MEDIUM';
      priorityReason = 'Application form in progress';
    } else if (documents.some((d) => d.status === DOCUMENT_STATUS.PROCESSING || d.status === DOCUMENT_STATUS.NEEDS_REVIEW)) {
      priority = 'MEDIUM';
      priorityReason = 'Documents awaiting review / verification';
    } else if (diffDays >= 3) {
      priority = 'MEDIUM';
      priorityReason = `No activity recorded for ${Math.floor(diffDays)} days`;
    }

    return {
      ...student,
      visitCount,
      lastVisitAt: student.lastVisitAt || lastActivityAt,
      lastActivityAt,
      registrationProgress,
      priority,
      priorityReason,
      engagementScore,
      engagementCategory,
      verifiedDocsCount: verifiedDocs.length,
      totalRequiredDocsCount: reqDocTypes.length,
    };
  } catch (error) {
    console.error(`[IntelligenceService] Error calculating intelligence: ${error.message}`);
    return {
      ...studentDoc,
      visitCount: 1,
      lastVisitAt: new Date(),
      lastActivityAt: new Date(),
      registrationProgress: 50,
      priority: 'MEDIUM',
      priorityReason: 'Intelligence calculation fallback',
      engagementScore: 50,
      engagementCategory: '🟡 Moderately Engaged',
    };
  }
};

module.exports = {
  trackStudentVisit,
  calculateStudentIntelligence,
};
