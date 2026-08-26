const Student = require('../models/Student');
const Application = require('../models/Application');
const { LIFECYCLE_STAGES, LIFECYCLE_ORDER } = require('../config/constants');
const { logAudit } = require('./auditService');
const { emitToStudent, emitToCounselors } = require('../config/socket');

// Valid allowed transitions map
const ALLOWED_TRANSITIONS = {
  [LIFECYCLE_STAGES.REGISTERED]: [LIFECYCLE_STAGES.LEAD, LIFECYCLE_STAGES.APPLICATION_STARTED],
  [LIFECYCLE_STAGES.LEAD]: [LIFECYCLE_STAGES.APPLICATION_STARTED],
  [LIFECYCLE_STAGES.APPLICATION_STARTED]: [LIFECYCLE_STAGES.APPLICATION_COMPLETED],
  [LIFECYCLE_STAGES.APPLICATION_COMPLETED]: [LIFECYCLE_STAGES.DOCUMENTS_PENDING, LIFECYCLE_STAGES.DOCUMENT_VERIFICATION],
  [LIFECYCLE_STAGES.DOCUMENTS_PENDING]: [LIFECYCLE_STAGES.DOCUMENT_VERIFICATION],
  [LIFECYCLE_STAGES.DOCUMENT_VERIFICATION]: [
    LIFECYCLE_STAGES.ELIGIBILITY_CHECK,
    LIFECYCLE_STAGES.DOCUMENTS_PENDING, // if replacement required
  ],
  [LIFECYCLE_STAGES.ELIGIBILITY_CHECK]: [
    LIFECYCLE_STAGES.PAYMENT_PENDING,
    LIFECYCLE_STAGES.ADMISSION_REVIEW,
    LIFECYCLE_STAGES.DOCUMENT_VERIFICATION,
  ],
  [LIFECYCLE_STAGES.PAYMENT_PENDING]: [
    LIFECYCLE_STAGES.ADMISSION_REVIEW,
    LIFECYCLE_STAGES.ADMISSION_APPROVED,
  ],
  [LIFECYCLE_STAGES.ADMISSION_REVIEW]: [
    LIFECYCLE_STAGES.ADMISSION_APPROVED,
  ],
  [LIFECYCLE_STAGES.ADMISSION_APPROVED]: [
    LIFECYCLE_STAGES.ENROLLMENT_GENERATED,
    LIFECYCLE_STAGES.ENROLLED,
  ],
  [LIFECYCLE_STAGES.ENROLLMENT_GENERATED]: [LIFECYCLE_STAGES.ENROLLED],
  [LIFECYCLE_STAGES.ENROLLED]: [], // Terminal state
};

/**
 * Validates and applies a lifecycle state transition
 */
const transitionStudentStage = async ({
  studentId,
  targetStage,
  actorId = 'SYSTEM',
  actorType = 'SYSTEM',
  reason = '',
}) => {
  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error(`Student with ID ${studentId} not found`);
  }

  const currentStage = student.currentStage;

  if (currentStage === targetStage) {
    return { student, transitioned: false, message: 'Already at target stage' };
  }

  const allowedNextStages = ALLOWED_TRANSITIONS[currentStage] || [];
  
  // Counselor and Admin can override, but student/AI cannot make illegal state jumps
  const isAuthorizedOverride = ['COUNSELOR', 'ADMIN', 'SYSTEM'].includes(actorType);
  if (!allowedNextStages.includes(targetStage) && !isAuthorizedOverride) {
    throw new Error(
      `Invalid lifecycle transition: Cannot move from ${currentStage} to ${targetStage}`
    );
  }

  // Update student stage
  student.currentStage = targetStage;
  await student.save();

  // If student has an active application, keep in sync
  if (student.currentApplication) {
    await Application.findByIdAndUpdate(student.currentApplication, {
      status: targetStage,
    });
  }

  // Log transition audit
  await logAudit({
    actorId,
    actorType,
    studentId: student._id,
    trackingId: student.trackingId,
    action: 'LIFECYCLE_STAGE_TRANSITION',
    result: 'SUCCESS',
    metadata: {
      fromStage: currentStage,
      toStage: targetStage,
      reason,
    },
  });

  // Emit real-time event
  emitToStudent(student.trackingId, 'lifecycle:stage_changed', {
    trackingId: student.trackingId,
    previousStage: currentStage,
    newStage: targetStage,
  });

  emitToCounselors('student:stage_updated', {
    trackingId: student.trackingId,
    studentName: `${student.firstName} ${student.lastName}`,
    currentStage: targetStage,
  });

  return {
    student,
    transitioned: true,
    fromStage: currentStage,
    toStage: targetStage,
  };
};

module.exports = {
  LIFECYCLE_STAGES,
  LIFECYCLE_ORDER,
  ALLOWED_TRANSITIONS,
  transitionStudentStage,
};
