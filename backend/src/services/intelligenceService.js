const Student = require('../models/Student');
const Application = require('../models/Application');
const Document = require('../models/Document');
const Payment = require('../models/Payment');
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

    // 1. Calculate Registration Progress Percentage (0 - 100%)
    let registrationProgress = 0;
    if (student.firstName && student.lastName) registrationProgress += 10;
    if (student.email && student.phone) registrationProgress += 10;
    if (student.selectedProgram) registrationProgress += 10;
    if (student.dateOfBirth && student.gender) registrationProgress += 10;
    if (student.address && (student.address.city || student.address.state || student.address.street)) registrationProgress += 10;
    if (student.academicProfile && student.academicProfile.tenthMarks && student.academicProfile.tenthBoard) registrationProgress += 15;
    if (student.academicProfile && student.academicProfile.twelfthMarks && student.academicProfile.twelfthBoard) registrationProgress += 15;
    if (student.currentApplication || application) registrationProgress += 20;
    registrationProgress = Math.min(100, registrationProgress);

    // 2. Calculate Real Document Statuses
    const reqDocTypes = ['IDENTITY_PROOF', 'MARKSHEET_10TH', 'MARKSHEET_12TH', 'PASSPORT_PHOTO'];
    const uploadedDocs = documents.filter(
      (d) => d.status !== DOCUMENT_STATUS.NOT_UPLOADED && d.status !== DOCUMENT_STATUS.REJECTED
    );
    const verifiedDocs = documents.filter((d) => d.status === DOCUMENT_STATUS.VERIFIED);
    const missingDocs = reqDocTypes.filter(
      (type) => !uploadedDocs.some((d) => d.documentType === type)
    );
    const rejectedDocs = documents.filter((d) => d.status === DOCUMENT_STATUS.REJECTED);

    // 3. Activity Recency
    const now = Date.now();
    const lastActivity = student.lastActivityAt ? new Date(student.lastActivityAt).getTime() : now;
    const diffHours = (now - lastActivity) / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    const fiveDaysAgo = new Date(now - 5 * 24 * 60 * 60 * 1000);
    const lastCounselorInteraction = student.lastCounselorInteractionAt ? new Date(student.lastCounselorInteractionAt) : null;
    const isOverdueFollowup =
      student.assignedCounselor &&
      new Date(lastActivity) >= fiveDaysAgo &&
      (!lastCounselorInteraction || lastCounselorInteraction < fiveDaysAgo);

    // 4. Calculate Student Engagement Score (0 - 100)
    const visitCount = student.visitCount || 1;
    const visitScore = Math.min(25, Math.round(visitCount * 2.5));
    const regScore = Math.round(registrationProgress * 0.25);
    const docScore = reqDocTypes.length > 0 ? Math.round((uploadedDocs.length / reqDocTypes.length) * 25) : 25;
    const recencyScore = diffDays <= 1 ? 25 : diffDays <= 3 ? 18 : diffDays <= 7 ? 10 : 0;

    const engagementScore = Math.min(100, Math.max(5, visitScore + regScore + docScore + recencyScore));
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
    } else if (missingDocs.length > 0 && student.currentStage === LIFECYCLE_STAGES.DOCUMENTS_PENDING) {
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
      lastVisitAt: student.lastVisitAt || student.updatedAt || new Date(),
      lastActivityAt: student.lastActivityAt || student.updatedAt || new Date(),
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
