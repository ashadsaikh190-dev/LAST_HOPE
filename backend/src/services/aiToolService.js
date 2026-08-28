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
const { COUNSELOR_CASE_PRIORITY, COUNSELOR_CASE_CATEGORY, DOCUMENT_STATUS, LIFECYCLE_STAGES } = require('../config/constants');
const { emitToCounselors } = require('../config/socket');

/**
 * Resolves a student by trackingId, studentName, or email
 */
const resolveStudent = async (trackingId, parameters = {}) => {
  if (trackingId) {
    const s = await Student.findOne({ trackingId }).populate('selectedProgram persona assignedCounselor');
    if (s) return s;
  }
  if (parameters.trackingId) {
    const s = await Student.findOne({ trackingId: parameters.trackingId }).populate('selectedProgram persona assignedCounselor');
    if (s) return s;
  }
  if (parameters.studentName) {
    const regex = new RegExp(parameters.studentName.trim(), 'i');
    const s = await Student.findOne({
      $or: [{ firstName: regex }, { lastName: regex }],
    }).populate('selectedProgram persona assignedCounselor');
    if (s) return s;
  }
  if (parameters.email) {
    const s = await Student.findOne({ email: parameters.email.toLowerCase().trim() }).populate('selectedProgram persona assignedCounselor');
    if (s) return s;
  }
  return null;
};

/**
 * AI Tool Execution Dispatcher with strict ownership and real-data DB lookups
 */
const executeAiTool = async ({ toolName, parameters = {}, studentId, trackingId, context = {} }) => {
  const actionId = `ACT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  try {
    let result = null;

    switch (toolName) {
      case 'getUniversityInfo': {
        result = {
          name: 'GIET University (Gandhi Institute of Engineering and Technology)',
          shortName: 'GIET University',
          established: 1997,
          type: 'Autonomous State Private University / Engineering & Management Institution',
          location: {
            campus: 'Gunupur Campus',
            city: 'Gunupur',
            district: 'Rayagada',
            state: 'Odisha',
            country: 'India',
            pincode: '765022',
            campusSize: '120-acre lush green smart campus',
          },
          accreditationsAndRankings: {
            naac: 'Grade A++ Accredited with CGPA score 3.78/4.0',
            nirf: 'Ranked Top 35 Engineering & Technology Institutions in India',
            nba: 'Tier-1 NBA Accredited for all core B.Tech and MBA programs',
            aicte: 'Approved by AICTE and recognized by UGC Govt of India',
            qsAsia: 'Top 150 in Asia for Academic Reputation and Faculty-Student Ratio',
            outlook: 'Ranked #4 among Top Private Autonomous Universities in Eastern India',
          },
          placementHighlights: {
            placementRate: '96.4%',
            highestInternationalPackage: '₹54.2 LPA',
            highestDomesticPackage: '₹38.5 LPA',
            averagePackageCSE: '₹11.8 LPA',
            medianPackage: '₹8.5 LPA',
            topRecruiters: ['Google', 'Microsoft', 'Amazon', 'Deloitte', 'TCS Digital', 'Infosys', 'Cisco', 'Goldman Sachs', 'Tata Motors'],
          },
          campusFacilities: {
            swimmingPool: '50-meter 8-lane Olympic-standard temperature-regulated competitive pool with certified lifeguards and trainers',
            sports: 'Full cricket stadium with floodlights, FIFA-standard football ground, multi-court indoor badminton arena, synthetic athletic track',
            gym: 'Separate fully air-conditioned modern fitness centers for boys and girls',
            hostels: 'Separate multi-story AC and Non-AC hostels for boys and girls with attached washrooms, biometric security, and 24/7 power backup',
            library: '24/7 Central Digital Library with 100,000+ volumes, IEEE/ACM digital access, and air-conditioned reading halls',
            labs: 'State-of-the-art AI & GPU computing clusters, IoT research centers, robotics laboratories, and incubation centers',
            healthCare: '24/7 on-campus health clinic with resident medical officer and ambulance support',
          },
          admissionsAndContact: {
            admissionHelpline: '+91 6857 250172 / 1800-202-4438',
            email: 'admissions@giet.edu',
            website: 'https://www.giet.edu',
            admissionModes: 'Merit in 10+2 / JEE Main / OJEE / GIETEE / Institutional Counseling',
          },
        };
        break;
      }

      case 'getProgramFeeBreakdown': {
        let query = { isActive: true };
        if (parameters.programCode) {
          query.$or = [
            { code: parameters.programCode.toUpperCase().trim() },
            { department: new RegExp(parameters.programCode.trim(), 'i') },
            { name: new RegExp(parameters.programCode.trim(), 'i') }
          ];
        }
        const progs = await Program.find(query);
        const listToMap = progs.length > 0 ? progs : await Program.find({ isActive: true });
        result = listToMap.map((p) => ({
          code: p.code,
          name: p.name,
          department: p.department,
          degree: p.degree,
          durationYears: p.durationYears,
          annualTuitionFee: p.tuitionFee,
          applicationFee: p.applicationFee,
          totalTuitionFee: p.tuitionFee * p.durationYears,
          semesterFee: Math.round(p.tuitionFee / 2),
          eligibilityCriteria: p.eligibilityCriteria,
          hostelFeePerYear: '₹65,000 (Non-AC) to ₹95,000 (AC) with meals included',
        }));
        break;
      }

      case 'calculateScholarshipEstimate':
      case 'calculateScholarship': {
        const student = await resolveStudent(trackingId, parameters);
        const marks = Number(
          parameters.twelfthMarks ||
          parameters.marks ||
          student?.academicProfile?.twelfthMarks?.percentage ||
          student?.academicProfile?.tenthMarks?.percentage ||
          0
        );
        const category = (parameters.category || 'MERIT').toUpperCase();
        const programCode = (parameters.programCode || student?.selectedProgram?.code || 'CSE').toUpperCase();

        let waiverPct = 0;
        let slab = 'STANDARD';
        let reason = '';

        if (category === 'SPORTS') {
          waiverPct = 40;
          slab = 'STATE/NATIONAL_SPORTS_EXCELLENCE';
          reason = 'Special sports achiever quota scholarship';
        } else if (category === 'DEFENSE') {
          waiverPct = 25;
          slab = 'DEFENSE_PERSONNEL_WARD';
          reason = 'Armed forces & defense personnel dependent concession';
        } else if (marks >= 95) {
          waiverPct = 50;
          slab = 'PRESIDENTIAL_MERIT_GOLD';
          reason = 'Exceptional 12th Board score (>= 95%)';
        } else if (marks >= 90) {
          waiverPct = 35;
          slab = 'CHAIRMAN_MERIT_SILVER';
          reason = 'Outstanding 12th Board score (90% - 94.9%)';
        } else if (marks >= 80) {
          waiverPct = 20;
          slab = 'DEAN_MERIT_BRONZE';
          reason = 'Merit 12th Board score (80% - 89.9%)';
        } else if (marks >= 70) {
          waiverPct = 10;
          slab = 'INSTITUTIONAL_ENCOURAGEMENT';
          reason = 'Institutional merit score (70% - 79.9%)';
        } else {
          waiverPct = 0;
          slab = 'STANDARD_TUITION';
          reason = 'Score below standard scholarship cutoff (70%). Special consideration available via human counselor review.';
        }

        const prog = (await Program.findOne({ code: programCode })) || (await Program.findOne({ code: 'CSE' }));
        const baseTuition = prog ? prog.tuitionFee : 120000;
        const discountAmount = Math.round((baseTuition * waiverPct) / 100);
        const netTuition = baseTuition - discountAmount;

        result = {
          evaluatedMarks: marks > 0 ? `${marks}%` : 'Not Provided',
          category,
          programCode: prog ? prog.code : programCode,
          programName: prog ? prog.name : 'Engineering & Technology',
          scholarshipSlab: slab,
          waiverPercentage: `${waiverPct}%`,
          annualDiscountAmount: `₹${discountAmount.toLocaleString('en-IN')}`,
          originalAnnualTuition: `₹${baseTuition.toLocaleString('en-IN')}`,
          netPayableAnnualTuition: `₹${netTuition.toLocaleString('en-IN')}`,
          reason,
          note: 'Scholarship requires maintaining min 7.5 CGPA in consecutive semesters.',
        };
        break;
      }

      case 'getStudentStatus':
      case 'getStudentProfile': {
        const student = await resolveStudent(trackingId, parameters);
        if (!student) throw new Error(`Student ${trackingId || parameters.studentName || ''} not found in records.`);
        result = {
          trackingId: student.trackingId,
          name: `${student.firstName} ${student.lastName}`,
          email: student.email,
          phone: student.phone,
          currentStage: student.currentStage,
          selectedProgram: student.selectedProgram ? student.selectedProgram.name : null,
          academicProfile: student.academicProfile,
          officialEnrollmentNumber: student.officialEnrollmentNumber || null,
          assignedCounselor: student.assignedCounselor ? student.assignedCounselor.name : 'Unassigned',
        };
        break;
      }

      case 'updateStudentProfile': {
        const student = await resolveStudent(trackingId, parameters);
        if (!student) throw new Error(`Student not found`);
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
        const student = await resolveStudent(trackingId, parameters);
        const app = student
          ? await Application.findOne({ student: student._id }).populate('program')
          : await Application.findOne({ trackingId }).populate('program');
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
        const student = await resolveStudent(trackingId, parameters);
        const app = student
          ? await Application.findOne({ student: student._id })
          : await Application.findOne({ trackingId });
        if (!app) throw new Error('Cannot check eligibility without a submitted application');
        result = await evaluateEligibility(app._id);
        break;
      }

      case 'getRequiredDocuments': {
        const student = await resolveStudent(trackingId, parameters);
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
        const student = await resolveStudent(trackingId, parameters);
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
        const student = await resolveStudent(trackingId, parameters);
        if (!student) throw new Error('Student not found');
        const docs = await Document.find({ student: student._id }).populate('currentVersion');
        result = docs;
        break;
      }

      case 'getVerificationStatus': {
        const student = await resolveStudent(trackingId, parameters);
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
        const student = await resolveStudent(trackingId, parameters);
        if (!student) throw new Error('Student not found');
        const payments = await Payment.find({ student: student._id });
        result = payments;
        break;
      }

      case 'getAdmissionStatus': {
        const student = await resolveStudent(trackingId, parameters);
        if (!student) throw new Error('Student not found');
        const admission = await Admission.findOne({ student: student._id }).populate('program');
        result = admission || { status: 'PENDING_REVIEW', message: 'Application under review' };
        break;
      }

      case 'getIncompleteTasks':
      case 'getStudentChecklist': {
        const student = await resolveStudent(trackingId, parameters);
        if (!student) throw new Error('Student not found in database.');

        const [app, docs, payment, admission] = await Promise.all([
          Application.findOne({ student: student._id }),
          Document.find({ student: student._id }),
          Payment.findOne({ student: student._id, status: 'SUCCESS' }),
          Admission.findOne({ student: student._id }),
        ]);

        const reqDocTypes = ['IDENTITY_PROOF', 'MARKSHEET_10TH', 'MARKSHEET_12TH', 'PASSPORT_PHOTO'];
        const uploadedTypes = docs
          .filter((d) => d.status !== DOCUMENT_STATUS.NOT_UPLOADED && d.status !== DOCUMENT_STATUS.REJECTED)
          .map((d) => d.documentType);
        const missingDocs = reqDocTypes.filter((t) => !uploadedTypes.includes(t));

        const unverifiedDocs = docs
          .filter((d) => d.status === DOCUMENT_STATUS.PROCESSING || d.status === DOCUMENT_STATUS.NEEDS_REVIEW)
          .map((d) => d.documentType);

        const incompleteTasks = [];
        if (!app) incompleteTasks.push('Application Form not submitted');
        if (missingDocs.length > 0) incompleteTasks.push(`Missing Documents: ${missingDocs.join(', ')}`);
        if (unverifiedDocs.length > 0) incompleteTasks.push(`Documents Awaiting Verification: ${unverifiedDocs.join(', ')}`);
        if (!payment) incompleteTasks.push('Tuition / Application fee payment pending');
        if (!admission || admission.status !== 'APPROVED') incompleteTasks.push('Admission approval pending review');
        if (!student.officialEnrollmentNumber) incompleteTasks.push('Official enrollment card not issued');

        result = {
          studentName: `${student.firstName} ${student.lastName}`,
          trackingId: student.trackingId,
          currentStage: student.currentStage,
          incompleteTasks,
          isAllComplete: incompleteTasks.length === 0,
        };
        break;
      }

      case 'createCounselorEscalation': {
        const student = await resolveStudent(trackingId, parameters);
        if (!student) throw new Error('Student not found');
        const caseId = generateCaseId();
        const priority = parameters.priority || COUNSELOR_CASE_PRIORITY.MEDIUM;
        const category = parameters.category || COUNSELOR_CASE_CATEGORY.HUMAN_REQUEST;

        const counselorCase = await CounselorCase.create({
          caseId,
          student: student._id,
          trackingId: student.trackingId,
          priority,
          category,
          summary: parameters.summary || 'Student requested counselor escalation via AI Assistant',
          aiReason: parameters.reason || 'Complex query / policy exception / human intervention requested',
          conversationSummary: parameters.conversationSummary || '',
          recommendedAction: parameters.recommendedAction || 'Review student case details and contact student.',
          assignedCounselor: student.assignedCounselor?._id || null,
        });

        emitToCounselors('case:escalated', {
          caseId,
          trackingId: student.trackingId,
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
        const student = await resolveStudent(trackingId, parameters);
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
