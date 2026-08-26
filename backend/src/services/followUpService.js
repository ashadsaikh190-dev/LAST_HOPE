const FollowUp = require('../models/FollowUp');
const Student = require('../models/Student');
const Document = require('../models/Document');
const Application = require('../models/Application');
const { DOCUMENT_STATUS, LIFECYCLE_STAGES } = require('../config/constants');
const { createNotification } = require('./notificationService');
const { isServiceAllowed } = require('./costProtectionService');

/**
 * Checks student's stage and missing items to schedule appropriate follow-up
 */
const scheduleAutomatedFollowUp = async (studentId) => {
  // Check if background automation is paused due to Cost Protection (Level 3/4)
  const isJobsAllowed = await isServiceAllowed('scheduledJobs');
  if (!isJobsAllowed) {
    console.log('[FollowUp Service] Automated background follow-up skipped: AWS Cost Protection is currently active.');
    return { skipped: true, reason: 'AWS cost protection is currently active: scheduled background automation paused.' };
  }

  const student = await Student.findById(studentId).populate('user selectedProgram');
  if (!student) return null;

  // Check if a follow-up was created in the last 24 hours to prevent spam
  const recentFollowUp = await FollowUp.findOne({
    student: studentId,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  });

  if (recentFollowUp) {
    return { skipped: true, reason: 'Recent follow-up already sent within 24 hours' };
  }

  let triggerType = null;
  let message = '';

  // Stage 1: Document Check
  if (
    student.currentStage === LIFECYCLE_STAGES.APPLICATION_COMPLETED ||
    student.currentStage === LIFECYCLE_STAGES.DOCUMENTS_PENDING
  ) {
    const pendingDocs = await Document.find({
      student: studentId,
      isRequired: true,
      status: { $in: [DOCUMENT_STATUS.NOT_UPLOADED, DOCUMENT_STATUS.REJECTED, DOCUMENT_STATUS.MISMATCH] },
    });

    if (pendingDocs.length > 0) {
      triggerType = 'MISSING_DOCUMENTS';
      const docNames = pendingDocs.map((d) => d.documentType).join(', ');
      message = `Friendly reminder: Please upload your pending documents (${docNames}) to complete your admission verification for ${student.selectedProgram?.name || 'your program'}.`;
    }
  }

  // Stage 2: Payment Pending Check
  if (student.currentStage === LIFECYCLE_STAGES.PAYMENT_PENDING) {
    triggerType = 'PAYMENT_PENDING';
    message = `Your academic eligibility is confirmed! Please complete your application fee payment to finalize your admission offer.`;
  }

  if (!triggerType) return null;

  const followUp = await FollowUp.create({
    student: student._id,
    trackingId: student.trackingId,
    triggerType,
    scheduledFor: new Date(),
    status: 'EXECUTED',
    message,
    executedAt: new Date(),
    resultNotes: 'Dispatched via multi-channel notification engine',
  });

  await createNotification({
    studentId: student._id,
    trackingId: student.trackingId,
    type: 'EMAIL',
    title: 'Admissions Update & Action Required - GIET University',
    content: message,
    recipient: student.email,
  });

  return followUp;
};

module.exports = {
  scheduleAutomatedFollowUp,
};
