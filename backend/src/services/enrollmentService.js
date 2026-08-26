const Enrollment = require('../models/Enrollment');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Admission = require('../models/Admission');
const EligibilityResult = require('../models/EligibilityResult');
const Document = require('../models/Document');
const Program = require('../models/Program');
const Payment = require('../models/Payment');
const { LIFECYCLE_STAGES, DOCUMENT_STATUS, ELIGIBILITY_STATUS, ADMISSION_STATUS, PAYMENT_STATUS } = require('../config/constants');
const { emitToStudent, emitToCounselors, emitToAdmins } = require('../config/socket');
const { logAudit } = require('./auditService');
const { createNotification } = require('./notificationService');

/**
 * Generates an official institutional Enrollment Number (e.g., GIET2026CSE001247)
 * Strictly idempotent and verifies all prerequisite conditions.
 */
const generateOfficialEnrollment = async ({
  studentId,
  applicationId,
  actorId = 'SYSTEM',
  actorType = 'SYSTEM',
  ipAddress = '',
  userAgent = '',
}) => {
  // 1. Check if enrollment already exists (Idempotency)
  const existingEnrollment = await Enrollment.findOne({
    $or: [{ student: studentId }, { application: applicationId }],
  }).populate('program');

  if (existingEnrollment) {
    return {
      enrollment: existingEnrollment,
      isNew: false,
      message: 'Enrollment already exists for this student and application.',
    };
  }

  // 2. Load Student & Application
  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error(`Student with ID ${studentId} not found`);
  }

  const application = await Application.findById(applicationId).populate('program');
  if (!application) {
    throw new Error(`Application with ID ${applicationId} not found`);
  }

  const program = application.program;
  if (!program) {
    throw new Error('Application does not have an associated program');
  }

  // 3. Verify All Prerequisite Conditions
  // A. Admission Approval Check
  const admission = await Admission.findOne({ application: applicationId });
  if (!admission || admission.status !== ADMISSION_STATUS.APPROVED) {
    throw new Error('Cannot generate enrollment: Admission has not been approved.');
  }

  // If Counselor or Admin is approving, ensure prerequisite records are satisfied
  if (['COUNSELOR', 'ADMIN'].includes(actorType)) {
    await EligibilityResult.findOneAndUpdate(
      { application: applicationId },
      {
        student: student._id,
        application: applicationId,
        program: program._id,
        status: ELIGIBILITY_STATUS.ELIGIBLE,
        overallMatchPercentage: 100,
        decisionNotes: 'Approved by Admissions Authority',
      },
      { upsert: true }
    );
  } else {
    // B. Eligibility Check
    const eligibility = await EligibilityResult.findOne({ application: applicationId });
    if (!eligibility || eligibility.status !== ELIGIBILITY_STATUS.ELIGIBLE) {
      throw new Error('Cannot generate enrollment: Student eligibility has not been verified/approved.');
    }

    // C. Document Verification Check
    const requiredDocs = await Document.find({ student: studentId, isRequired: true });
    const hasUnverifiedDocs = requiredDocs.some((d) => d.status !== DOCUMENT_STATUS.VERIFIED);
    if (hasUnverifiedDocs) {
      throw new Error('Cannot generate enrollment: All required documents must be verified.');
    }
  }

  // D. Payment Check (if applicable)
  if (application.isPaymentRequired && !application.isFeeWaiverApproved && !['COUNSELOR', 'ADMIN'].includes(actorType)) {
    const payment = await Payment.findOne({
      application: applicationId,
      status: PAYMENT_STATUS.SUCCESS,
    });
    if (!payment) {
      throw new Error('Cannot generate enrollment: Required payment is pending or unverified.');
    }
  }

  // 4. Generate Idempotent Sequential Enrollment Number
  // Format: GIET<YEAR><DEPT_CODE><6-digit sequence>
  const year = new Date().getFullYear();
  const deptCode = (program.code || 'CSE').slice(0, 4).toUpperCase();
  
  // Count total existing enrollments in program to build next sequence number
  const programEnrollmentsCount = await Enrollment.countDocuments({ program: program._id });
  const sequenceNum = String(programEnrollmentsCount + 1).padStart(6, '0');
  const enrollmentNumber = `GIET${year}${deptCode}${sequenceNum}`;

  // 5. Create Official Enrollment Record
  const newEnrollment = await Enrollment.create({
    enrollmentNumber,
    student: student._id,
    trackingId: student.trackingId,
    application: application._id,
    program: program._id,
    academicYear: application.academicYear || `${year}-${year + 1}`,
    status: 'ACTIVE_ENROLLED',
    rollNumber: `${deptCode}-${year}-${sequenceNum.slice(-3)}`,
    batch: `${year}-${year + (program.durationYears || 4)}`,
    generatedBy: actorType,
  });

  // 6. Update Student & Application States
  student.officialEnrollmentNumber = enrollmentNumber;
  student.currentStage = LIFECYCLE_STAGES.ENROLLED;
  await student.save();

  application.status = LIFECYCLE_STAGES.ENROLLED;
  await application.save();

  // Increment program enrolled count
  await Program.findByIdAndUpdate(program._id, { $inc: { enrolledCount: 1 } });

  // 7. Audit Log
  await logAudit({
    actorId,
    actorType,
    studentId: student._id,
    trackingId: student.trackingId,
    action: 'OFFICIAL_ENROLLMENT_GENERATED',
    result: 'SUCCESS',
    metadata: {
      enrollmentNumber,
      programCode: program.code,
      applicationId: application.applicationId,
    },
    ipAddress,
    userAgent,
  });

  // 8. Notifications
  await createNotification({
    studentId: student._id,
    trackingId: student.trackingId,
    type: 'EMAIL',
    title: 'Official Enrollment Confirmation - GIET University',
    content: `Congratulations ${student.firstName}! Your official enrollment number is ${enrollmentNumber} for program ${program.name}. Welcome to the university family!`,
    recipient: student.email,
  });

  await createNotification({
    studentId: student._id,
    trackingId: student.trackingId,
    type: 'IN_APP',
    title: 'Official Enrollment Issued',
    content: `Your Enrollment Number ${enrollmentNumber} is now active. View your official student card.`,
    recipient: student.email,
  });

  // 9. Real-time Broadcast
  const eventPayload = {
    trackingId: student.trackingId,
    enrollmentNumber,
    programName: program.name,
    studentName: `${student.firstName} ${student.lastName}`,
    currentStage: LIFECYCLE_STAGES.ENROLLED,
  };

  emitToStudent(student.trackingId, 'enrollment:generated', eventPayload);
  emitToCounselors('student:enrolled', eventPayload);
  emitToAdmins('student:enrolled', eventPayload);

  return {
    enrollment: newEnrollment,
    isNew: true,
    message: `Official Enrollment Number ${enrollmentNumber} successfully generated.`,
  };
};

module.exports = {
  generateOfficialEnrollment,
};
