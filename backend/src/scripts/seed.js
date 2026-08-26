const mongoose = require('mongoose');
const User = require('../models/User');
const Program = require('../models/Program');
const Workflow = require('../models/Workflow');
const config = require('../config/env');
const { ROLES, DOCUMENT_TYPES } = require('../config/constants');

const seedDatabase = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(config.MONGODB_URI);
    console.log('[Seed] Connected to MongoDB');

    // 1. Create Default Admin User (Idempotent)
    const adminEmail = 'admin@university.edu';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        name: 'Dean of Admissions',
        email: adminEmail,
        password: 'AdminPassword123!',
        role: ROLES.ADMIN,
        phone: '+919876543210',
      });
      console.log(`[Seed] Created Admin: ${adminEmail} / AdminPassword123!`);
    } else {
      console.log(`[Seed] Admin user already exists: ${adminEmail}`);
    }

    // 2. Create Default Counselor User (Idempotent)
    const counselorEmail = 'counselor@university.edu';
    let counselor = await User.findOne({ email: counselorEmail });
    if (!counselor) {
      counselor = await User.create({
        name: 'Senior Admissions Counselor',
        email: counselorEmail,
        password: 'CounselorPassword123!',
        role: ROLES.COUNSELOR,
        phone: '+919876543211',
      });
      console.log(`[Seed] Created Counselor: ${counselorEmail} / CounselorPassword123!`);
    } else {
      console.log(`[Seed] Counselor user already exists: ${counselorEmail}`);
    }

    // 3. Create Institutional Programs Catalog (Idempotent)
    const programsData = [
      {
        code: 'CSE',
        name: 'B.Tech in Computer Science & Engineering',
        department: 'Computer Science',
        degree: 'B.Tech',
        durationYears: 4,
        tuitionFee: 110000,
        applicationFee: 1000,
        seatCapacity: 180,
        eligibilityCriteria: {
          minTenthMarks: 60,
          minTwelfthMarks: 65,
          requiredSubjects: ['Physics', 'Mathematics', 'Chemistry'],
          preferredStream: 'Science',
        },
        requiredDocumentTypes: [
          DOCUMENT_TYPES.IDENTITY_PROOF,
          DOCUMENT_TYPES.MARKSHEET_10TH,
          DOCUMENT_TYPES.MARKSHEET_12TH,
          DOCUMENT_TYPES.PASSPORT_PHOTO,
        ],
        applicationDeadline: new Date('2026-10-31'),
        description: 'Flagship engineering program specializing in Software Engineering, AI, Cloud Computing, and Cybersecurity.',
      },
      {
        code: 'AI_DS',
        name: 'B.Tech in Artificial Intelligence & Data Science',
        department: 'Computer Science',
        degree: 'B.Tech',
        durationYears: 4,
        tuitionFee: 120000,
        applicationFee: 1000,
        seatCapacity: 120,
        eligibilityCriteria: {
          minTenthMarks: 60,
          minTwelfthMarks: 70,
          requiredSubjects: ['Physics', 'Mathematics'],
          preferredStream: 'Science',
        },
        requiredDocumentTypes: [
          DOCUMENT_TYPES.IDENTITY_PROOF,
          DOCUMENT_TYPES.MARKSHEET_10TH,
          DOCUMENT_TYPES.MARKSHEET_12TH,
          DOCUMENT_TYPES.PASSPORT_PHOTO,
        ],
        applicationDeadline: new Date('2026-10-31'),
        description: 'Cutting-edge program focusing on Machine Learning, Deep Learning, Big Data Analytics, and Autonomous Systems.',
      },
      {
        code: 'ECE',
        name: 'B.Tech in Electronics & Communication Engineering',
        department: 'Electronics',
        degree: 'B.Tech',
        durationYears: 4,
        tuitionFee: 95000,
        applicationFee: 1000,
        seatCapacity: 120,
        eligibilityCriteria: {
          minTenthMarks: 55,
          minTwelfthMarks: 60,
          requiredSubjects: ['Physics', 'Mathematics'],
          preferredStream: 'Science',
        },
        requiredDocumentTypes: [
          DOCUMENT_TYPES.IDENTITY_PROOF,
          DOCUMENT_TYPES.MARKSHEET_10TH,
          DOCUMENT_TYPES.MARKSHEET_12TH,
          DOCUMENT_TYPES.PASSPORT_PHOTO,
        ],
        applicationDeadline: new Date('2026-10-31'),
        description: 'Comprehensive study of VLSI design, Embedded Systems, IoT, and Next-Gen Wireless Telecommunications.',
      },
      {
        code: 'MECH',
        name: 'B.Tech in Mechanical Engineering',
        department: 'Mechanical',
        degree: 'B.Tech',
        durationYears: 4,
        tuitionFee: 85000,
        applicationFee: 1000,
        seatCapacity: 90,
        eligibilityCriteria: {
          minTenthMarks: 50,
          minTwelfthMarks: 55,
          requiredSubjects: ['Physics', 'Mathematics'],
          preferredStream: 'Science',
        },
        requiredDocumentTypes: [
          DOCUMENT_TYPES.IDENTITY_PROOF,
          DOCUMENT_TYPES.MARKSHEET_10TH,
          DOCUMENT_TYPES.MARKSHEET_12TH,
          DOCUMENT_TYPES.PASSPORT_PHOTO,
        ],
        applicationDeadline: new Date('2026-10-31'),
        description: 'Focus on Robotics, Mechatronics, CAD/CAM, Automotive design, and Renewable Energy Systems.',
      },
      {
        code: 'MBA',
        name: 'Master of Business Administration',
        department: 'Management',
        degree: 'MBA',
        durationYears: 2,
        tuitionFee: 140000,
        applicationFee: 1500,
        seatCapacity: 60,
        eligibilityCriteria: {
          minTenthMarks: 50,
          minTwelfthMarks: 50,
          preferredStream: 'Any',
        },
        requiredDocumentTypes: [
          DOCUMENT_TYPES.IDENTITY_PROOF,
          DOCUMENT_TYPES.MARKSHEET_10TH,
          DOCUMENT_TYPES.MARKSHEET_12TH,
          DOCUMENT_TYPES.PASSPORT_PHOTO,
        ],
        applicationDeadline: new Date('2026-10-31'),
        description: 'Premier business leadership program offering specializations in Marketing, Finance, HR, and Analytics.',
      },
    ];

    for (const p of programsData) {
      await Program.findOneAndUpdate({ code: p.code }, p, { upsert: true, new: true });
      console.log(`[Seed] Synchronized Program: ${p.code} - ${p.name}`);
    }

    // 4. Create Default Autonomous Workflow Definitions (Idempotent)
    const workflowsData = [
      {
        name: 'Automated Document OCR & Verification',
        triggerEvent: 'DOCUMENT_UPLOADED',
        conditions: [],
        actions: [{ actionType: 'DISPATCH_SQS_OCR' }, { actionType: 'CHECK_ELIGIBILITY' }],
        isActive: true,
      },
      {
        name: 'Missing Documents Follow-up Reminder',
        triggerEvent: 'DOCUMENTS_PENDING',
        conditions: [],
        actions: [{ actionType: 'SCHEDULE_FOLLOW_UP', parameters: { delayHours: 24 } }],
        isActive: true,
      },
      {
        name: 'Instant Enrollment on Admission Offer',
        triggerEvent: 'ADMISSION_APPROVED',
        conditions: [],
        actions: [{ actionType: 'GENERATE_ENROLLMENT' }, { actionType: 'SEND_EMAIL_NOTIFICATION' }],
        isActive: true,
      },
    ];

    for (const w of workflowsData) {
      await Workflow.findOneAndUpdate({ name: w.name }, w, { upsert: true });
      console.log(`[Seed] Synchronized Workflow: ${w.name}`);
    }

    console.log('[Seed] Database initialization complete. ZERO fake student records created.');
  } catch (error) {
    console.error('[Seed Error]', error);
    throw error;
  }
};

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedDatabase;
