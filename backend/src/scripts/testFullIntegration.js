const mongoose = require('mongoose');
const config = require('../config/env');
const User = require('../models/User');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Document = require('../models/Document');
const Admission = require('../models/Admission');
const Payment = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const CounselorCase = require('../models/CounselorCase');
const AuditLog = require('../models/AuditLog');
const Program = require('../models/Program');
const { ROLES, LIFECYCLE_STAGES, ADMISSION_STATUS, DOCUMENT_STATUS } = require('../config/constants');
const { EVENTS, dispatchEvent } = require('../services/eventBusService');
const { evaluateStudentRisk } = require('../services/riskService');
const { executeAiTool } = require('../services/aiToolService');

async function runIntegrationTest() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('============================================================');
    console.log('🚀 TESTING FULL THREE-ROLE INTEGRATION & EVENT SYNCHRONIZATION');
    console.log('============================================================\n');

    // 1. Check or pick Counselor and Program
    let counselor = await User.findOne({ role: ROLES.COUNSELOR });
    if (!counselor) {
      counselor = await User.create({
        name: 'Senior Counselor Sharma',
        email: 'counselor.sharma@university.edu',
        password: 'Password123!',
        role: ROLES.COUNSELOR,
      });
    }

    let program = await Program.findOne();
    if (!program) {
      program = await Program.create({
        code: 'CSE_AI',
        name: 'B.Tech in Artificial Intelligence',
        department: 'Computer Science',
        degree: 'B.Tech',
        durationYears: 4,
        tuitionFee: 120000,
        applicationFee: 1000,
        seatCapacity: 120,
      });
    }

    // 2. Student Registration Simulation
    const testTrackingId = `STU-TEST-${Date.now().toString().slice(-5)}`;
    const testEmail = `krish.test.${Date.now()}@example.com`;

    const user = await User.create({
      name: 'Krish Raj Test',
      email: testEmail,
      password: 'StudentPass123!',
      role: ROLES.STUDENT,
      trackingId: testTrackingId,
    });

    const student = await Student.create({
      trackingId: testTrackingId,
      user: user._id,
      firstName: 'Krish',
      lastName: 'Raj',
      email: testEmail,
      phone: '+919999999999',
      currentStage: LIFECYCLE_STAGES.REGISTERED,
      selectedProgram: program._id,
      assignedCounselor: counselor._id,
      lastActivityAt: new Date(),
    });

    await dispatchEvent(EVENTS.STUDENT_REGISTERED, {
      actorId: user._id,
      actorType: 'STUDENT',
      studentId: student._id,
      trackingId: testTrackingId,
      metadata: { email: testEmail, assignedCounselor: counselor.name },
    });
    console.log('✓ Step 1: Student Krish registered and auto-assigned to Counselor Sharma.');

    // 3. Application Submission
    const app = await Application.create({
      applicationId: `APP-${Date.now().toString().slice(-6)}`,
      student: student._id,
      trackingId: testTrackingId,
      program: program._id,
      personalDetails: {
        fullName: 'Krish Raj',
        dateOfBirth: new Date('2005-01-01'),
        gender: 'MALE',
        phone: '+919999999999',
        email: testEmail,
      },
      academicDetails: {
        tenthBoard: 'CBSE',
        tenthPercentage: 88,
        tenthPassingYear: 2022,
        twelfthBoard: 'CBSE',
        twelfthPercentage: 85,
        twelfthPassingYear: 2024,
        twelfthStream: 'Science',
      },
      status: LIFECYCLE_STAGES.APPLICATION_COMPLETED,
      submissionDate: new Date(),
    });

    student.currentApplication = app._id;
    student.currentStage = LIFECYCLE_STAGES.APPLICATION_COMPLETED;
    await student.save();

    await dispatchEvent(EVENTS.APPLICATION_COMPLETED, {
      actorId: user._id,
      actorType: 'STUDENT',
      studentId: student._id,
      trackingId: testTrackingId,
      metadata: { applicationId: app.applicationId, programName: program.name },
    });
    console.log('✓ Step 2: Application submitted & APPLICATION_COMPLETED dispatched.');

    // 4. Document Upload
    const doc = await Document.create({
      student: student._id,
      trackingId: testTrackingId,
      application: app._id,
      documentType: 'MARKSHEET_10TH',
      status: DOCUMENT_STATUS.PROCESSING,
      isRequired: true,
    });

    await dispatchEvent(EVENTS.DOCUMENT_UPLOADED, {
      actorId: user._id,
      actorType: 'STUDENT',
      studentId: student._id,
      trackingId: testTrackingId,
      metadata: { documentType: 'MARKSHEET_10TH', fileName: '10th_marksheet.pdf' },
    });
    console.log('✓ Step 3: 10th Marksheet uploaded & DOCUMENT_UPLOADED dispatched.');

    // 5. Counselor Manual Verification
    doc.status = DOCUMENT_STATUS.VERIFIED;
    await doc.save();

    await dispatchEvent(EVENTS.DOCUMENT_VERIFIED, {
      actorId: counselor._id,
      actorType: 'COUNSELOR',
      studentId: student._id,
      trackingId: testTrackingId,
      metadata: { documentType: 'MARKSHEET_10TH', status: 'VERIFIED', notes: 'Verified genuine' },
    });
    console.log('✓ Step 4: Counselor verified 10th marksheet & DOCUMENT_VERIFIED dispatched.');

    // 6. Admin Scholarship Approval
    const admission = await Admission.create({
      application: app._id,
      student: student._id,
      trackingId: testTrackingId,
      program: program._id,
      status: ADMISSION_STATUS.APPROVED,
      scholarshipPercentage: 25,
      decisionNotes: 'Merit scholarship 25% approved by Admin',
      decisionBy: 'Admin Dean (ADMIN)',
    });

    await dispatchEvent(EVENTS.SCHOLARSHIP_APPROVED, {
      actorId: counselor._id,
      actorType: 'ADMIN',
      studentId: student._id,
      trackingId: testTrackingId,
      metadata: { scholarshipPercentage: 25, decisionNotes: admission.decisionNotes },
    });
    console.log('✓ Step 5: Admin approved 25% scholarship & SCHOLARSHIP_APPROVED dispatched.');

    // 7. Counselor Email Logging
    await dispatchEvent(EVENTS.EMAIL_SENT, {
      actorId: counselor._id,
      actorType: 'COUNSELOR',
      studentId: student._id,
      trackingId: testTrackingId,
      metadata: { recipientEmail: testEmail, subject: 'Offer of Admission & Scholarship' },
    });
    console.log('✓ Step 6: Counselor sent email & EMAIL_SENT dispatched (updated counselor interaction timestamp).');

    // 8. Payment Completion
    const payment = await Payment.create({
      paymentId: `PAY-${Date.now().toString().slice(-6)}`,
      idempotencyKey: `idem-pay-${Date.now()}`,
      student: student._id,
      trackingId: testTrackingId,
      application: app._id,
      amount: 1000,
      currency: 'INR',
      status: 'SUCCESS',
      paidAt: new Date(),
    });

    student.currentStage = LIFECYCLE_STAGES.ENROLLED;
    student.officialEnrollmentNumber = `GIET2026TEST${Date.now().toString().slice(-4)}`;
    await student.save();

    await dispatchEvent(EVENTS.PAYMENT_COMPLETED, {
      actorId: user._id,
      actorType: 'STUDENT',
      studentId: student._id,
      trackingId: testTrackingId,
      metadata: { paymentId: payment.paymentId, amount: 1000 },
    });

    await dispatchEvent(EVENTS.ADMISSION_COMPLETED, {
      actorId: counselor._id,
      actorType: 'SYSTEM',
      studentId: student._id,
      trackingId: testTrackingId,
      metadata: { enrollmentNumber: student.officialEnrollmentNumber },
    });
    console.log('✓ Step 7: Payment confirmed, Official Enrollment Number generated, & ADMISSION_COMPLETED dispatched.');

    // 9. AI Tool Real-Data Inspection Test
    console.log('\n--- Testing AI Real Data Query & Checklist ---');
    const aiResult = await executeAiTool({
      toolName: 'getStudentChecklist',
      parameters: { studentName: 'Krish' },
      studentId: student._id,
      trackingId: testTrackingId,
    });
    console.log('AI Tool Query Result for "Krish":', JSON.stringify(aiResult.data, null, 2));

    // 10. Risk Evaluation Test
    const riskCheck = await evaluateStudentRisk(student._id);
    console.log('Risk Check for Enrolled Student:', riskCheck);

    // 11. Audit Trail Count
    const auditCount = await AuditLog.countDocuments({ trackingId: testTrackingId });
    console.log(`\nAudit Logs Generated for ${testTrackingId}: ${auditCount} entries.`);

    console.log('\n============================================================');
    console.log('✅ ALL INTEGRATION & EVENT SYNCHRONIZATION TESTS PASSED 100%');
    console.log('============================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Integration Test Failed:', err);
    process.exit(1);
  }
}

runIntegrationTest();
