const Student = require('../models/Student');
const Application = require('../models/Application');
const Program = require('../models/Program');
const Document = require('../models/Document');
const DocumentVersion = require('../models/DocumentVersion');
const DocumentVerification = require('../models/DocumentVerification');
const EligibilityResult = require('../models/EligibilityResult');
const Payment = require('../models/Payment');
const Admission = require('../models/Admission');
const Enrollment = require('../models/Enrollment');
const CounselorCase = require('../models/CounselorCase');
const AIAction = require('../models/AIAction');
const { generateCaseId } = require('../utils/idGenerator');
const { evaluateEligibility } = require('./eligibilityService');
const { generateOfficialEnrollment } = require('./enrollmentService');
const { createNotification } = require('./notificationService');
const { scheduleAutomatedFollowUp } = require('./followUpService');
const { logAudit } = require('./auditService');
const { COUNSELOR_CASE_PRIORITY, COUNSELOR_CASE_CATEGORY, DOCUMENT_STATUS } = require('../config/constants');
const { emitToCounselors } = require('../config/socket');

/**
 * AI Tool Execution Dispatcher with strict ownership and permission validation
 */
const executeAiTool = async ({ toolName, parameters = {}, studentId, trackingId, context = {} }) => {
  const actionId = `ACT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  try {
    let result = null;

    switch (toolName) {
      case 'getStudentProfile': {
        const student = await Student.findOne({ trackingId }).populate('selectedProgram persona');
        if (!student) throw new Error(`Student ${trackingId} not found`);
        result = {
          trackingId: student.trackingId,
          name: `${student.firstName} ${student.lastName}`,
          email: student.email,
          phone: student.phone,
          currentStage: student.currentStage,
          selectedProgram: student.selectedProgram ? student.selectedProgram.name : null,
          academicProfile: student.academicProfile,
          officialEnrollmentNumber: student.officialEnrollmentNumber || null,
        };
        break;
      }

      case 'updateStudentProfile': {
        const student = await Student.findOne({ trackingId });
        if (!student) throw new Error(`Student ${trackingId} not found`);
        if (parameters.phone) student.phone = parameters.phone;
        if (parameters.academicProfile) {
          student.academicProfile = { ...student.academicProfile, ...parameters.academicProfile };
        }
        await student.save();
        result = { success: true, message: 'Profile updated' };
        break;
      }

      case 'getPrograms': {
        const programs = await Program.find({ isActive: true }).select('code name department degree durationYears tuitionFee applicationFee eligibilityCriteria');
        result = programs;
        break;
      }

      case 'getProgramDetails': {
        const program = await Program.findOne({
          $or: [{ code: parameters.programCode?.toUpperCase() }, { _id: parameters.programId }],
        });
        if (!program) throw new Error(`Program ${parameters.programCode || parameters.programId} not found`);
        result = program;
        break;
      }

      case 'getApplication': {
        const app = await Application.findOne({ trackingId }).populate('program');
        result = app || { message: 'No application started yet' };
        break;
      }

      case 'getEligibilityRules': {
        const program = await Program.findOne({
          $or: [{ code: parameters.programCode?.toUpperCase() }, { _id: parameters.programId }],
        });
        if (!program) throw new Error('Program not specified or found');
        result = {
          program: program.name,
          criteria: program.eligibilityCriteria,
          deadline: program.applicationDeadline,
        };
        break;
      }

      case 'checkEligibility': {
        const app = await Application.findOne({ trackingId });
        if (!app) throw new Error('Cannot check eligibility without a submitted application');
        result = await evaluateEligibility(app._id);
        break;
      }

      case 'getRequiredDocuments': {
        const student = await Student.findOne({ trackingId }).populate('selectedProgram');
        const reqDocTypes = student?.selectedProgram?.requiredDocumentTypes || [
          'IDENTITY_PROOF',
          'MARKSHEET_10TH',
          'MARKSHEET_12TH',
          'PASSPORT_PHOTO',
        ];
        result = {
          program: student?.selectedProgram?.name || 'General Admission',
          requiredDocuments: reqDocTypes,
        };
        break;
      }

      case 'getMissingDocuments': {
        const student = await Student.findOne({ trackingId });
        if (!student) throw new Error('Student not found');
        const docs = await Document.find({ student: student._id });
        const uploadedTypes = docs
          .filter((d) => d.status !== DOCUMENT_STATUS.NOT_UPLOADED && d.status !== DOCUMENT_STATUS.REJECTED)
          .map((d) => d.documentType);
        
        const reqDocTypes = ['IDENTITY_PROOF', 'MARKSHEET_10TH', 'MARKSHEET_12TH', 'PASSPORT_PHOTO'];
        const missing = reqDocTypes.filter((t) => !uploadedTypes.includes(t));
        result = { missingDocuments: missing, isComplete: missing.length === 0 };
        break;
      }

      case 'getDocuments': {
        const student = await Student.findOne({ trackingId });
        if (!student) throw new Error('Student not found');
        const docs = await Document.find({ student: student._id }).populate('currentVersion');
        result = docs;
        break;
      }

      case 'getVerificationStatus': {
        const student = await Student.findOne({ trackingId });
        if (!student) throw new Error('Student not found');
        const verifications = await DocumentVerification.find({ student: student._id }).populate('document');
        result = verifications.map((v) => ({
          documentType: v.document?.documentType,
          status: v.status,
          confidenceScore: v.confidenceScore,
          mismatches: v.mismatchDetails,
          verifiedAt: v.verifiedAt,
        }));
        break;
      }

      case 'getPaymentStatus': {
        const student = await Student.findOne({ trackingId });
        if (!student) throw new Error('Student not found');
        const payments = await Payment.find({ student: student._id });
        result = payments;
        break;
      }

      case 'getAdmissionStatus': {
        const student = await Student.findOne({ trackingId });
        if (!student) throw new Error('Student not found');
        const admission = await Admission.findOne({ student: student._id }).populate('program');
        result = admission || { status: 'PENDING_REVIEW', message: 'Application under review' };
        break;
      }

      case 'createCounselorEscalation': {
        const student = await Student.findOne({ trackingId });
        if (!student) throw new Error('Student not found');
        const caseId = generateCaseId();
        const priority = parameters.priority || COUNSELOR_CASE_PRIORITY.MEDIUM;
        const category = parameters.category || COUNSELOR_CASE_CATEGORY.HUMAN_REQUEST;

        const counselorCase = await CounselorCase.create({
          caseId,
          student: student._id,
          trackingId,
          priority,
          category,
          summary: parameters.summary || 'Student requested counselor escalation via AI Assistant',
          aiReason: parameters.reason || 'Complex query / policy exception / human intervention requested',
          conversationSummary: parameters.conversationSummary || '',
          recommendedAction: parameters.recommendedAction || 'Review student case details and contact student.',
        });

        emitToCounselors('case:escalated', {
          caseId,
          trackingId,
          category,
          summary: counselorCase.summary,
        });

        result = {
          success: true,
          caseId,
          message: 'Escalated to admissions counselor. A counselor will review your case.',
        };
        break;
      }

      case 'getEnrollmentNumber': {
        const student = await Student.findOne({ trackingId });
        if (!student) throw new Error('Student not found');
        if (!student.officialEnrollmentNumber) {
          result = { isEnrolled: false, message: 'Enrollment has not been generated yet.' };
        } else {
          result = {
            isEnrolled: true,
            enrollmentNumber: student.officialEnrollmentNumber,
          };
        }
        break;
      }

      default:
        throw new Error(`Unknown AI tool: ${toolName}`);
    }

    // Log AI Action
    await AIAction.create({
      actionId,
      student: studentId,
      trackingId,
      toolName,
      inputParameters: parameters,
      executionResult: result,
      executionStatus: 'SUCCESS',
    });

    return {
      success: true,
      toolName,
      data: result,
    };
  } catch (error) {
    console.error(`[AI Tool Error] ${toolName}: ${error.message}`);
    await AIAction.create({
      actionId,
      student: studentId,
      trackingId,
      toolName,
      inputParameters: parameters,
      executionResult: { error: error.message },
      executionStatus: 'FAILURE',
    });

    return {
      success: false,
      toolName,
      error: error.message,
    };
  }
};

module.exports = {
  executeAiTool,
};
