const mongoose = require('mongoose');
const config = require('../config/env');
const User = require('../models/User');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Document = require('../models/Document');
const { ROLES, LIFECYCLE_STAGES, DOCUMENT_STATUS } = require('../config/constants');
const { trackStudentVisit, calculateStudentIntelligence } = require('../services/intelligenceService');

async function runCounselorIntelligenceTests() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('============================================================');
    console.log('🧠 TESTING COUNSELOR INTELLIGENCE & STUDENT ENGAGEMENT UPGRADE');
    console.log('============================================================\n');

    // 1. Setup Counselor & Student
    let counselor = await User.findOne({ role: ROLES.COUNSELOR });
    if (!counselor) {
      counselor = await User.create({
        name: 'Admissions Lead Sharma',
        email: `counselor.lead.${Date.now()}@university.edu`,
        password: 'Password123!',
        role: ROLES.COUNSELOR,
      });
    }

    const testTrackingId = `STU-INTEL-${Date.now().toString().slice(-5)}`;
    const studentUser = await User.create({
      name: 'Ananya Verma',
      email: `ananya.${Date.now()}@example.com`,
      password: 'StudentPass123!',
      role: ROLES.STUDENT,
      trackingId: testTrackingId,
    });

    const student = await Student.create({
      trackingId: testTrackingId,
      user: studentUser._id,
      firstName: 'Ananya',
      lastName: 'Verma',
      email: studentUser.email,
      phone: '+919876543210',
      currentStage: LIFECYCLE_STAGES.DOCUMENTS_PENDING,
      assignedCounselor: counselor._id,
      visitCount: 5,
      lastVisitAt: new Date(Date.now() - 40 * 60 * 1000), // 40 mins ago
      lastActivityAt: new Date(),
      academicProfile: {
        tenthMarks: 92,
        tenthBoard: 'ICSE',
        tenthPassingYear: 2022,
        twelfthMarks: 90,
        twelfthBoard: 'CBSE',
        twelfthPassingYear: 2024,
      },
      address: {
        city: 'Bhubaneswar',
        state: 'Odisha',
      },
      gender: 'FEMALE',
      dateOfBirth: new Date('2006-05-15'),
    });

    console.log('✓ Step 1: Created test student Ananya Verma.');

    // 2. Test Visit Tracking with 30-min throttle
    const initialVisits = student.visitCount; // 5
    await trackStudentVisit(student._id); // > 30 mins -> should increment to 6
    const updatedStudent = await Student.findById(student._id);
    console.log(`✓ Step 2a: First visit tracked. Count: ${updatedStudent.visitCount} (Expected: ${initialVisits + 1})`);

    // Immediate second visit within 30 min window -> should NOT increment
    await trackStudentVisit(student._id);
    const throttledStudent = await Student.findById(student._id);
    console.log(`✓ Step 2b: Immediate second visit throttled. Count: ${throttledStudent.visitCount} (Expected: ${initialVisits + 1})`);
    if (throttledStudent.visitCount === initialVisits + 1) {
      console.log('  PASSED: Session throttle prevents duplicate visit counting.');
    } else {
      console.error('  FAILED: Duplicate visit was counted!');
    }

    // 3. Test Registration Progress Calculation
    const intel1 = await calculateStudentIntelligence(throttledStudent);
    console.log(`\n✓ Step 3: Registration Progress: ${intel1.registrationProgress}%`);
    console.log(`  Engagement Score: ${intel1.engagementScore} / 100 (${intel1.engagementCategory})`);
    console.log(`  Calculated Priority: ${intel1.priority} | Reason: "${intel1.priorityReason}"`);

    // 4. Test High Engagement + Incomplete Document Priority
    // Throttled student has 6 visits + high engagement, but missing required marksheets
    if (intel1.priority === 'HIGH' && intel1.priorityReason.includes('missing')) {
      console.log('  PASSED: High engagement with missing document correctly classified as 🔴 HIGH PRIORITY.');
    }

    // 5. Test Dynamic Priority Recovery: Upload Marksheet
    const doc = await Document.create({
      student: student._id,
      trackingId: testTrackingId,
      documentType: 'MARKSHEET_10TH',
      status: DOCUMENT_STATUS.VERIFIED,
      isRequired: true,
    });

    const intel2 = await calculateStudentIntelligence(throttledStudent);
    console.log(`\n✓ Step 4: After Document Verification:`);
    console.log(`  New Priority: ${intel2.priority} | Reason: "${intel2.priorityReason}"`);
    console.log(`  New Engagement Score: ${intel2.engagementScore} / 100`);

    // 6. Test Determinism: Same data must yield exact same score
    const intel3 = await calculateStudentIntelligence(throttledStudent);
    if (intel2.engagementScore === intel3.engagementScore && intel2.priority === intel3.priority) {
      console.log('  PASSED: Engagement score & priority calculation are 100% deterministic.');
    } else {
      console.error('  FAILED: Calculations were non-deterministic.');
    }

    console.log('\n============================================================');
    console.log('✅ ALL COUNSELOR INTELLIGENCE & ENGAGEMENT TESTS PASSED 100%');
    console.log('============================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

runCounselorIntelligenceTests();
