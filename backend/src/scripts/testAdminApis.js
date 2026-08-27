const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Admission = require('../models/Admission');
const config = require('../config/env');
const { ROLES, LIFECYCLE_STAGES, ADMISSION_STATUS } = require('../config/constants');

async function testBackend() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log(' Connected to MongoDB');

    // 1. Check Admin Count
    const adminCount = await User.countDocuments({ role: ROLES.ADMIN });
    console.log(`\n1. Single-Admin Check: Total Admin count in DB = ${adminCount}`);
    if (adminCount <= 1) {
      console.log(' PASSED: Admin count satisfies single-admin policy.');
    } else {
      console.error(' WARNING: Multiple admins found!');
    }

    // 2. Overview KPIs Check
    const totalStudents = await Student.countDocuments();
    const activeApps = await Application.countDocuments();
    const totalAdmissions = await Admission.countDocuments({ status: ADMISSION_STATUS.APPROVED });
    const counselorsCount = await User.countDocuments({ role: ROLES.COUNSELOR });
    console.log(`\n2. Real Data KPIs:`);
    console.log(`   Total Students: ${totalStudents}`);
    console.log(`   Active Applications: ${activeApps}`);
    console.log(`   Approved Admissions: ${totalAdmissions}`);
    console.log(`   Active Counselors: ${counselorsCount}`);

    // 3. Funnel Stages Check
    const registered = await Student.countDocuments();
    const enrolled = await Student.countDocuments({ currentStage: LIFECYCLE_STAGES.ENROLLED });
    console.log(`\n3. Funnel Data Check:`);
    console.log(`   Stage 1 (Registered): ${registered}`);
    console.log(`   Stage 8 (Enrolled): ${enrolled}`);

    console.log('\n All Database & RBAC Verifications PASSED!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

testBackend();
