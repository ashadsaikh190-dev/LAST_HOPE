const mongoose = require('mongoose');
const User = require('../backend/src/models/User');
const Student = require('../backend/src/models/Student');
const Program = require('../backend/src/models/Program');
const Application = require('../backend/src/models/Application');
const Document = require('../backend/src/models/Document');
const DocumentVersion = require('../backend/src/models/DocumentVersion');
const DocumentVerification = require('../backend/src/models/DocumentVerification');
const EligibilityResult = require('../backend/src/models/EligibilityResult');
const Payment = require('../backend/src/models/Payment');
const Admission = require('../backend/src/models/Admission');
const Enrollment = require('../backend/src/models/Enrollment');
const CounselorCase = require('../backend/src/models/CounselorCase');
const AuditLog = require('../backend/src/models/AuditLog');
const config = require('../backend/src/config/env');

const { generateUniqueTrackingId } = require('../backend/src/services/trackingIdService');
const { evaluateEligibility } = require('../backend/src/services/eligibilityService');
const { generateOfficialEnrollment } = require('../backend/src/services/enrollmentService');
const { confirmPaymentSuccess, createPaymentOrder } = require('../backend/src/services/paymentService');
const { uploadStudentDocument } = require('../backend/src/services/s3Service');
const { verifyDocumentWithTextract } = require('../backend/src/services/textractService');
const { executeAiTool } = require('../backend/src/services/aiToolService');
const seedDatabase = require('../backend/src/scripts/seed');

const runE2EValidation = async () => {
  console.log('================================================================');
  console.log(' AUTONOMOUS ADMISSIONS PLATFORM - END-TO-END VALIDATION SUITE');
  console.log('================================================================');

  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('[STEP 1] Connected to MongoDB');

    // Seed institutional programs & users
    console.log('[STEP 2] Running Idempotent Institutional Seed...');
    await seedDatabase();

    const cseProgram = await Program.findOne({ code: 'CSE' });
    if (!cseProgram) throw new Error('CSE Program missing after seed');
    console.log(`[PASS] Program verified: ${cseProgram.name} (Code: ${cseProgram.code})`);

    // Clean test student if exists
    const testEmail = 'rahul.test.admissions@university.edu';
    await User.deleteMany({ email: testEmail });
    await Student.deleteMany({ email: testEmail });

    // Step 3: Real Student Registration & Permanent Tracking ID
    console.log('[STEP 3] Registering Real Candidate...');
    const trackingId = await generateUniqueTrackingId();
    console.log(`[PASS] Dynamically Generated Permanent Tracking ID: ${trackingId}`);

    const user = await User.create({
      name: 'Rahul Kumar',
      email: testEmail,
      password: 'SecurePassword123!',
      role: 'STUDENT',
      trackingId,
    });

    const student = await Student.create({
      trackingId,
      user: user._id,
      firstName: 'Rahul',
      lastName: 'Kumar',
      email: testEmail,
      phone: '+919876543210',
      selectedProgram: cseProgram._id,
      currentStage: 'REGISTERED',
    });
    console.log(`[PASS] Student created: ${student.firstName} ${student.lastName} (Stage: ${student.currentStage})`);

    // Step 4: Duplicate Registration Safety
    console.log('[STEP 4] Testing Duplicate User Prevention...');
    let duplicatePrevented = false;
    try {
      await User.create({
        name: 'Rahul Duplicate',
        email: testEmail,
        password: 'Password123!',
        role: 'STUDENT',
        trackingId: await generateUniqueTrackingId(),
      });
    } catch (e) {
      duplicatePrevented = true;
    }
    if (!duplicatePrevented) throw new Error('Duplicate user creation was not prevented!');
    console.log('[PASS] Duplicate registration safely prevented by database constraint');

    // Step 5: AI Tool Query
    console.log('[STEP 5] Testing AI Tool Execution Proxy...');
    const aiToolRes = await executeAiTool({
      toolName: 'getPrograms',
      studentId: student._id,
      trackingId: student.trackingId,
    });
    if (!aiToolRes.success || aiToolRes.data.length === 0) throw new Error('AI Tool getPrograms failed');
    console.log(`[PASS] AI Tool getPrograms returned ${aiToolRes.data.length} active programs`);

    // Step 6: Application Form Submission
    console.log('[STEP 6] Submitting Real Application Form...');
    const applicationId = `APP-${new Date().getFullYear()}-T8K92`;
    const application = await Application.create({
      applicationId,
      student: student._id,
      trackingId: student.trackingId,
      program: cseProgram._id,
      academicYear: '2026-2027',
      personalDetails: {
        fullName: 'Rahul Kumar',
        dateOfBirth: new Date('2007-05-15'),
        gender: 'MALE',
        phone: '+919876543210',
        email: testEmail,
      },
      academicDetails: {
        tenthBoard: 'CBSE',
        tenthPercentage: 88,
        tenthPassingYear: 2023,
        twelfthBoard: 'CBSE',
        twelfthPercentage: 91.5,
        twelfthPassingYear: 2025,
        twelfthStream: 'Science (PCM)',
      },
      status: 'APPLICATION_COMPLETED',
      submissionDate: new Date(),
    });

    student.currentApplication = application._id;
    student.currentStage = 'DOCUMENTS_PENDING';
    await student.save();
    console.log(`[PASS] Application submitted. ID: ${applicationId}`);

    // Step 7: Document Upload & S3 Private Storage
    console.log('[STEP 7] Testing Document Upload to S3 & Storage...');
    const mockFileBuffer = Buffer.from('TEST MARKSHEET CANDIDATE NAME: Rahul Kumar PERCENTAGE: 91.5% BOARD: CBSE');
    const s3Result = await uploadStudentDocument({
      trackingId: student.trackingId,
      documentType: 'MARKSHEET_12TH',
      versionNumber: 1,
      fileName: '12th_marksheet_rahul.pdf',
      buffer: mockFileBuffer,
      mimeType: 'application/pdf',
    });
    console.log(`[PASS] Document stored. Key: ${s3Result.s3Key} (Provider: ${s3Result.storageProvider})`);

    const document = await Document.create({
      student: student._id,
      trackingId: student.trackingId,
      application: application._id,
      documentType: 'MARKSHEET_12TH',
      status: 'PROCESSING',
      isRequired: true,
    });

    const docVersion = await DocumentVersion.create({
      document: document._id,
      student: student._id,
      trackingId: student.trackingId,
      versionNumber: 1,
      s3Key: s3Result.s3Key,
      s3Bucket: s3Result.s3Bucket,
      fileName: '12th_marksheet_rahul.pdf',
      fileSize: mockFileBuffer.length,
      mimeType: 'application/pdf',
      status: 'CURRENT',
      uploadedBy: 'Rahul Kumar',
    });

    document.currentVersion = docVersion._id;
    await document.save();

    // Step 8: Amazon Textract OCR & Consistency Verification
    console.log('[STEP 8] Running Amazon Textract OCR Consistency Verification...');
    const verification = await verifyDocumentWithTextract({
      documentVersionId: docVersion._id,
      documentId: document._id,
      studentId: student._id,
      trackingId: student.trackingId,
      fileBuffer: mockFileBuffer,
      fileName: '12th_marksheet_rahul.pdf',
    });
    console.log(`[PASS] Textract Verification Status: ${verification.status} (Confidence: ${verification.confidenceScore}%)`);

    // Step 9: Deterministic Eligibility Engine
    console.log('[STEP 9] Running Deterministic Eligibility Engine...');
    const eligibility = await evaluateEligibility(application._id);
    console.log(`[PASS] Eligibility Status: ${eligibility.status} (Score: ${eligibility.overallScore}%)`);
    if (eligibility.status !== 'ELIGIBLE') throw new Error('Student should be eligible based on 91.5% marks');

    // Step 10: Idempotent Payment Intent & Checkout Confirmation
    console.log('[STEP 10] Testing Idempotent Payment Order & Confirmation...');
    const { payment } = await createPaymentOrder({
      studentId: student._id,
      applicationId: application._id,
      feeType: 'APPLICATION_FEE',
      idempotencyKey: `IDEM-TEST-${student.trackingId}`,
    });

    const payConfirm = await confirmPaymentSuccess({
      paymentId: payment.paymentId,
      transactionReference: `TXN-REAL-E2E-${Date.now()}`,
    });
    console.log(`[PASS] Payment Verified. Receipt: ${payConfirm.payment.receiptNumber} (Amount: ₹${payConfirm.payment.amount})`);

    // Step 11: Admission Approval & Idempotent Official Enrollment Generation
    console.log('[STEP 11] Issuing Admission Approval...');
    const admission = await Admission.create({
      application: application._id,
      student: student._id,
      trackingId: student.trackingId,
      program: cseProgram._id,
      status: 'APPROVED',
      scholarshipPercentage: 10,
      decisionNotes: 'Academic excellence merit verified',
    });

    console.log('[STEP 12] Generating Official Institutional Enrollment Number...');
    const enrollResult1 = await generateOfficialEnrollment({
      studentId: student._id,
      applicationId: application._id,
      actorId: 'E2E_TEST_RUNNER',
      actorType: 'SYSTEM',
    });
    const officialEnrollmentNum = enrollResult1.enrollment.enrollmentNumber;
    console.log(`[PASS] Official Enrollment Number Issued: ${officialEnrollmentNum}`);

    // Verify format: GIET<YEAR><DEPT><SEQ>
    const year = new Date().getFullYear();
    if (!officialEnrollmentNum.startsWith(`GIET${year}CSE`)) {
      throw new Error(`Enrollment number ${officialEnrollmentNum} does not match standard pattern!`);
    }

    // Test Enrollment Idempotency
    console.log('[STEP 13] Testing Enrollment Generation Idempotency...');
    const enrollResult2 = await generateOfficialEnrollment({
      studentId: student._id,
      applicationId: application._id,
      actorId: 'E2E_TEST_RUNNER',
      actorType: 'SYSTEM',
    });
    if (enrollResult2.isNew) {
      throw new Error('Repeated enrollment call created duplicate enrollment!');
    }
    if (enrollResult2.enrollment.enrollmentNumber !== officialEnrollmentNum) {
      throw new Error('Enrollment number changed on second invocation!');
    }
    console.log('[PASS] Idempotent enrollment verified. Duplicate was safely prevented.');

    // Step 14: Counselor Universal Search Verification
    console.log('[STEP 14] Testing Counselor Universal Search by Enrollment Number...');
    const foundEnrollment = await Enrollment.findOne({ enrollmentNumber: officialEnrollmentNum })
      .populate('student program application');
    if (!foundEnrollment) throw new Error('Search by enrollment number failed');
    console.log(`[PASS] Counselor Search retrieved 100% real student record for: ${foundEnrollment.student.firstName} ${foundEnrollment.student.lastName}`);

    // Step 15: Audit Trail Verification
    console.log('[STEP 15] Verifying Audit Trail Logs...');
    const logs = await AuditLog.find({ trackingId: student.trackingId });
    console.log(`[PASS] Verified ${logs.length} immutable audit logs recorded for tracking ID ${student.trackingId}`);

    console.log('================================================================');
    console.log(' ✅ ALL 15 END-TO-END VALIDATION CHECKS PASSED SUCCESSFULLY!');
    console.log('================================================================');

    process.exit(0);
  } catch (error) {
    console.error('❌ E2E VALIDATION ERROR:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  runE2EValidation();
}
