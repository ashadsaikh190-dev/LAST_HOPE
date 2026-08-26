const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Program = require('../models/Program');
const Document = require('../models/Document');
const DocumentVersion = require('../models/DocumentVersion');
const DocumentVerification = require('../models/DocumentVerification');
const CounselorCase = require('../models/CounselorCase');
const config = require('../config/env');
const { ROLES, DOCUMENT_TYPES, DOCUMENT_STATUS, DOCUMENT_VERSION_STATUS, LIFECYCLE_STAGES, COUNSELOR_CASE_PRIORITY, COUNSELOR_CASE_CATEGORY, COUNSELOR_CASE_STATUS } = require('../config/constants');

const seedDocumentCases = async () => {
  try {
    console.log('[Seed Docs] Connecting to MongoDB...');
    await mongoose.connect(config.MONGODB_URI);
    console.log('[Seed Docs] Connected to MongoDB');

    const cseProgram = await Program.findOne({ code: 'CSE' }) || await Program.findOne();

    // 1. Create Demo Student 1: Rahul Sharma (Has Mismatch)
    const email1 = 'rahul.sharma@example.edu';
    let user1 = await User.findOne({ email: email1 });
    if (!user1) {
      user1 = await User.create({
        name: 'Rahul Sharma',
        email: email1,
        password: 'Password@2026',
        role: ROLES.STUDENT,
        phone: '+919876543220',
      });
    }

    let student1 = await Student.findOne({ email: email1 });
    if (!student1) {
      student1 = await Student.create({
        trackingId: 'STU-2026-94821',
        user: user1._id,
        firstName: 'Rahul',
        lastName: 'Sharma',
        email: email1,
        phone: '+919876543220',
        currentStage: LIFECYCLE_STAGES.DOCUMENT_VERIFICATION,
        selectedProgram: cseProgram?._id,
      });
      console.log(`[Seed Docs] Created Demo Student 1: ${email1}`);
    }

    // Application for Student 1
    let app1 = await Application.findOne({ student: student1._id });
    if (!app1) {
      app1 = await Application.create({
        student: student1._id,
        trackingId: student1.trackingId,
        program: cseProgram?._id,
        applicationId: 'APP-2026-7841',
        personalDetails: {
          fullName: 'Rahul Sharma',
          email: email1,
          phone: '+919876543220',
          dateOfBirth: new Date('2006-05-14'),
          gender: 'MALE',
        },
        academicDetails: {
          tenthPercentage: 88.5,
          tenthBoard: 'CBSE',
          tenthPassingYear: 2022,
          twelfthPercentage: 92.0,
          twelfthBoard: 'CBSE',
          twelfthPassingYear: 2024,
          twelfthStream: 'SCIENCE',
        },
      });
      student1.currentApplication = app1._id;
      await student1.save();
    }

    // Document 1: 12th Marksheet with Percentage Mismatch (92% reported vs 89.2% detected)
    let doc1 = await Document.findOne({ student: student1._id, documentType: DOCUMENT_TYPES.MARKSHEET_12TH });
    if (!doc1) {
      doc1 = await Document.create({
        student: student1._id,
        trackingId: student1.trackingId,
        application: app1._id,
        documentType: DOCUMENT_TYPES.MARKSHEET_12TH,
        status: DOCUMENT_STATUS.NEEDS_REVIEW,
        isRequired: true,
      });

      const ver1 = await DocumentVersion.create({
        document: doc1._id,
        student: student1._id,
        trackingId: student1.trackingId,
        versionNumber: 1,
        s3Key: `students/${student1.trackingId}/MARKSHEET_12TH/v1_12th_marksheet.pdf`,
        s3Bucket: config.AWS_S3_BUCKET,
        fileName: '12th_marksheet_rahul_sharma.pdf',
        fileSize: 1048576,
        mimeType: 'application/pdf',
        status: DOCUMENT_VERSION_STATUS.CURRENT,
        uploadedBy: 'Rahul Sharma',
      });

      doc1.currentVersion = ver1._id;
      await doc1.save();

      await DocumentVerification.create({
        documentVersion: ver1._id,
        document: doc1._id,
        student: student1._id,
        verificationEngine: 'TEXTRACT',
        status: DOCUMENT_STATUS.NEEDS_REVIEW,
        extractedData: {
          name: 'Rahul Sharma',
          percentage: 89.2,
          marks: 446,
          maxMarks: 500,
          board: 'Central Board of Secondary Education (CBSE)',
          passingYear: 2024,
          documentNumber: 'CBSE-2024-998241',
        },
        confidenceScore: 94.6,
        mismatchDetails: [
          {
            field: 'twelfthPercentage',
            applicationValue: '92%',
            documentValue: '89.2%',
            matchScore: 82,
            isSignificant: true,
          },
        ],
        verifiedAt: new Date(),
        verifiedBy: 'TEXTRACT_AUTO',
      });

      await CounselorCase.create({
        caseId: 'CASE-2026-DOC-01',
        student: student1._id,
        application: app1._id,
        trackingId: student1.trackingId,
        priority: COUNSELOR_CASE_PRIORITY.HIGH,
        category: COUNSELOR_CASE_CATEGORY.DOCUMENT_AMBIGUITY,
        status: COUNSELOR_CASE_STATUS.OPEN,
        summary: '12th Marksheet Percentage Discrepancy (92% reported vs 89.2% OCR detected)',
        aiReason: 'Amazon Textract OCR detected 89.2% total score, which diverges from the 92% entered on application form.',
        recommendedAction: 'Inspect uploaded scan and verify if 89.2% is sufficient for CSE eligibility criteria.',
      });

      console.log('[Seed Docs] Created Document Case 1: 12th Marksheet with Mismatch');
    }

    // 2. Create Demo Student 2: Ananya Verma (Transfer Certificate Name Spelling Discrepancy)
    const email2 = 'ananya.verma@example.edu';
    let user2 = await User.findOne({ email: email2 });
    if (!user2) {
      user2 = await User.create({
        name: 'Ananya Verma',
        email: email2,
        password: 'Password@2026',
        role: ROLES.STUDENT,
        phone: '+919876543221',
      });
    }

    let student2 = await Student.findOne({ email: email2 });
    if (!student2) {
      student2 = await Student.create({
        trackingId: 'STU-2026-38194',
        user: user2._id,
        firstName: 'Ananya',
        lastName: 'Verma',
        email: email2,
        phone: '+919876543221',
        currentStage: LIFECYCLE_STAGES.DOCUMENT_VERIFICATION,
        selectedProgram: cseProgram?._id,
      });
      console.log(`[Seed Docs] Created Demo Student 2: ${email2}`);
    }

    let app2 = await Application.findOne({ student: student2._id });
    if (!app2) {
      app2 = await Application.create({
        student: student2._id,
        trackingId: student2.trackingId,
        program: cseProgram?._id,
        applicationId: 'APP-2026-9214',
        personalDetails: {
          fullName: 'Ananya Verma',
          email: email2,
          phone: '+919876543221',
          dateOfBirth: new Date('2005-11-20'),
          gender: 'FEMALE',
        },
        academicDetails: {
          tenthPercentage: 94.0,
          tenthBoard: 'ICSE',
          tenthPassingYear: 2021,
          twelfthPercentage: 95.5,
          twelfthBoard: 'ISC',
          twelfthPassingYear: 2023,
          twelfthStream: 'SCIENCE',
        },
      });
      student2.currentApplication = app2._id;
      await student2.save();
    }

    let doc2 = await Document.findOne({ student: student2._id, documentType: DOCUMENT_TYPES.TRANSFER_CERTIFICATE });
    if (!doc2) {
      doc2 = await Document.create({
        student: student2._id,
        trackingId: student2.trackingId,
        application: app2._id,
        documentType: DOCUMENT_TYPES.TRANSFER_CERTIFICATE,
        status: DOCUMENT_STATUS.MISMATCH,
        isRequired: true,
      });

      const ver2 = await DocumentVersion.create({
        document: doc2._id,
        student: student2._id,
        trackingId: student2.trackingId,
        versionNumber: 1,
        s3Key: `students/${student2.trackingId}/TRANSFER_CERTIFICATE/v1_transfer_cert.pdf`,
        s3Bucket: config.AWS_S3_BUCKET,
        fileName: 'transfer_certificate_ananya.pdf',
        fileSize: 819200,
        mimeType: 'application/pdf',
        status: DOCUMENT_VERSION_STATUS.CURRENT,
        uploadedBy: 'Ananya Verma',
      });

      doc2.currentVersion = ver2._id;
      await doc2.save();

      await DocumentVerification.create({
        documentVersion: ver2._id,
        document: doc2._id,
        student: student2._id,
        verificationEngine: 'TEXTRACT',
        status: DOCUMENT_STATUS.MISMATCH,
        extractedData: {
          name: 'Ananya Varma',
          percentage: null,
          board: 'St. Xavier Senior Secondary School',
          passingYear: 2023,
          documentNumber: 'TC-2023-4412',
        },
        confidenceScore: 91.2,
        mismatchDetails: [
          {
            field: 'fullName',
            applicationValue: 'Ananya Verma',
            documentValue: 'Ananya Varma',
            matchScore: 78,
            isSignificant: true,
          },
        ],
        verifiedAt: new Date(),
        verifiedBy: 'TEXTRACT_AUTO',
      });

      await CounselorCase.create({
        caseId: 'CASE-2026-DOC-02',
        student: student2._id,
        application: app2._id,
        trackingId: student2.trackingId,
        priority: COUNSELOR_CASE_PRIORITY.MEDIUM,
        category: COUNSELOR_CASE_CATEGORY.DOCUMENT_AMBIGUITY,
        status: COUNSELOR_CASE_STATUS.OPEN,
        summary: 'Name Spelling Mismatch on Transfer Certificate (Verma vs Varma)',
        aiReason: 'Student application submitted as "Ananya Verma", but School Transfer Certificate lists "Ananya Varma".',
        recommendedAction: 'Verify government ID / 10th marksheet to confirm correct official legal spelling.',
      });

      console.log('[Seed Docs] Created Document Case 2: Transfer Certificate with Name Mismatch');
    }

    // 3. Create Demo Student 3: Priya Patel (Fully Verified Marksheet)
    const email3 = 'priya.patel@example.edu';
    let user3 = await User.findOne({ email: email3 });
    if (!user3) {
      user3 = await User.create({
        name: 'Priya Patel',
        email: email3,
        password: 'Password@2026',
        role: ROLES.STUDENT,
        phone: '+919876543222',
      });
    }

    let student3 = await Student.findOne({ email: email3 });
    if (!student3) {
      student3 = await Student.create({
        trackingId: 'STU-2026-15792',
        user: user3._id,
        firstName: 'Priya',
        lastName: 'Patel',
        email: email3,
        phone: '+919876543222',
        currentStage: LIFECYCLE_STAGES.DOCUMENT_VERIFICATION,
        selectedProgram: cseProgram?._id,
      });
      console.log(`[Seed Docs] Created Demo Student 3: ${email3}`);
    }

    let app3 = await Application.findOne({ student: student3._id });
    if (!app3) {
      app3 = await Application.create({
        student: student3._id,
        trackingId: student3.trackingId,
        program: cseProgram?._id,
        applicationId: 'APP-2026-3391',
        personalDetails: {
          fullName: 'Priya Patel',
          email: email3,
          phone: '+919876543222',
          dateOfBirth: new Date('2006-02-18'),
          gender: 'FEMALE',
        },
        academicDetails: {
          tenthPercentage: 96.2,
          tenthBoard: 'CBSE',
          tenthPassingYear: 2022,
          twelfthPercentage: 97.0,
          twelfthBoard: 'CBSE',
          twelfthPassingYear: 2024,
          twelfthStream: 'SCIENCE',
        },
      });
      student3.currentApplication = app3._id;
      await student3.save();
    }

    let doc3 = await Document.findOne({ student: student3._id, documentType: DOCUMENT_TYPES.MARKSHEET_10TH });
    if (!doc3) {
      doc3 = await Document.create({
        student: student3._id,
        trackingId: student3.trackingId,
        application: app3._id,
        documentType: DOCUMENT_TYPES.MARKSHEET_10TH,
        status: DOCUMENT_STATUS.VERIFIED,
        isRequired: true,
      });

      const ver3 = await DocumentVersion.create({
        document: doc3._id,
        student: student3._id,
        trackingId: student3.trackingId,
        versionNumber: 1,
        s3Key: `students/${student3.trackingId}/MARKSHEET_10TH/v1_10th_marksheet.pdf`,
        s3Bucket: config.AWS_S3_BUCKET,
        fileName: '10th_marksheet_priya.pdf',
        fileSize: 940000,
        mimeType: 'application/pdf',
        status: DOCUMENT_VERSION_STATUS.CURRENT,
        uploadedBy: 'Priya Patel',
      });

      doc3.currentVersion = ver3._id;
      await doc3.save();

      await DocumentVerification.create({
        documentVersion: ver3._id,
        document: doc3._id,
        student: student3._id,
        verificationEngine: 'TEXTRACT',
        status: DOCUMENT_STATUS.VERIFIED,
        extractedData: {
          name: 'Priya Patel',
          percentage: 96.2,
          marks: 481,
          maxMarks: 500,
          board: 'Central Board of Secondary Education (CBSE)',
          passingYear: 2022,
          documentNumber: 'CBSE-2022-881923',
        },
        confidenceScore: 98.8,
        mismatchDetails: [],
        verifiedAt: new Date(),
        verifiedBy: 'TEXTRACT_AUTO',
      });

      console.log('[Seed Docs] Created Document Case 3: 10th Marksheet 100% Verified');
    }

    console.log('[Seed Docs] Seeding complete! All document verification cases are ready.');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Docs Error]', error.message);
    process.exit(1);
  }
};

seedDocumentCases();
