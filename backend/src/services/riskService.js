const Student = require('../models/Student');
const Document = require('../models/Document');
const Application = require('../models/Application');
const Payment = require('../models/Payment');
const { LIFECYCLE_STAGES, DOCUMENT_STATUS, PAYMENT_STATUS } = require('../config/constants');

/**
 * Evaluates the real-time at-risk status of a student based on live database state and timestamps
 * Returns { isAtRisk: boolean, riskType: string, riskReason: string, riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' }
 */
const evaluateStudentRisk = async (studentId) => {
  try {
    const student = typeof studentId === 'object' && studentId._id
      ? studentId
      : await Student.findById(studentId).populate('selectedProgram currentApplication assignedCounselor');

    if (!student || student.currentStage === LIFECYCLE_STAGES.ENROLLED) {
      return { isAtRisk: false, riskType: 'ON_TRACK', riskReason: 'Enrolled or completed', riskLevel: 'LOW' };
    }

    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const lastStudentActivity = student.lastActivityAt || student.updatedAt || new Date();
    const lastCounselorInteraction = student.lastCounselorInteractionAt || null;

    // 1. Check Overdue Counselor Follow-up (Student active within 5 days, but counselor has not interacted > 5 days)
    if (
      student.assignedCounselor &&
      new Date(lastStudentActivity) >= fiveDaysAgo &&
      (!lastCounselorInteraction || new Date(lastCounselorInteraction) < fiveDaysAgo)
    ) {
      return {
        isAtRisk: true,
        riskType: 'FOLLOWUP_OVERDUE',
        riskReason: 'Student active recently, but counselor follow-up is overdue (> 5 days)',
        riskLevel: 'HIGH',
      };
    }

    // 2. Check Student Inactivity (> 5 days)
    if (new Date(lastStudentActivity) < fiveDaysAgo) {
      return {
        isAtRisk: true,
        riskType: 'STUDENT_INACTIVE',
        riskReason: 'No student activity recorded for more than 5 days',
        riskLevel: 'MEDIUM',
      };
    }

    // 3. Check Missing or Rejected Mandatory Documents
    if (student.currentStage === LIFECYCLE_STAGES.DOCUMENTS_PENDING || student.currentStage === LIFECYCLE_STAGES.DOCUMENT_VERIFICATION) {
      const documents = await Document.find({ student: student._id, isRequired: true });
      const hasRejectedOrMissing = documents.some(
        (d) => d.status === DOCUMENT_STATUS.NOT_UPLOADED || d.status === DOCUMENT_STATUS.REJECTED
      );
      if (hasRejectedOrMissing || documents.length === 0) {
        return {
          isAtRisk: true,
          riskType: 'DOCUMENTS_PENDING',
          riskReason: 'Mandatory certificates missing or rejected during verification',
          riskLevel: 'MEDIUM',
        };
      }
    }

    // 4. Check Tuition Payment Pending
    if (student.currentStage === LIFECYCLE_STAGES.PAYMENT_PENDING) {
      const successfulPayment = await Payment.findOne({ student: student._id, status: PAYMENT_STATUS.SUCCESS });
      if (!successfulPayment) {
        return {
          isAtRisk: true,
          riskType: 'PAYMENT_PENDING',
          riskReason: 'Admission acceptance fee payment pending',
          riskLevel: 'MEDIUM',
        };
      }
    }

    // Student is completely on track
    return {
      isAtRisk: false,
      riskType: 'ON_TRACK',
      riskReason: 'Candidate progressing normally through admissions pipeline',
      riskLevel: 'LOW',
    };
  } catch (error) {
    console.error(`[RiskService Error] Failed to evaluate student risk: ${error.message}`);
    return { isAtRisk: false, riskType: 'ON_TRACK', riskReason: 'Evaluation fallback', riskLevel: 'LOW' };
  }
};

module.exports = {
  evaluateStudentRisk,
};
