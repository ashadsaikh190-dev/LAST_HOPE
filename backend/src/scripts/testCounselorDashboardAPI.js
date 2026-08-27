const mongoose = require('mongoose');
const config = require('../config/env');
const Program = require('../models/Program');
const StudentPersona = require('../models/StudentPersona');
const User = require('../models/User');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Document = require('../models/Document');
const { calculateStudentIntelligence } = require('../services/intelligenceService');

async function testCounselorDashboardData() {
  await mongoose.connect(config.MONGODB_URI);
  const counselor = await User.findOne({ role: 'COUNSELOR' });

  const assignedStudents = await Student.find({ assignedCounselor: counselor._id })
    .populate('selectedProgram currentApplication')
    .lean();

  const intelligentAssigned = await Promise.all(
    assignedStudents.map((s) => calculateStudentIntelligence(s))
  );

  const highPriorityCount = intelligentAssigned.filter((s) => s.priority === 'HIGH').length;
  const mediumPriorityCount = intelligentAssigned.filter((s) => s.priority === 'MEDIUM').length;
  const lowPriorityCount = intelligentAssigned.filter((s) => s.priority === 'LOW').length;
  const totalScore = intelligentAssigned.reduce((acc, s) => acc + (s.engagementScore || 0), 0);
  const totalReg = intelligentAssigned.reduce((acc, s) => acc + (s.registrationProgress || 0), 0);
  const avgEngagement = intelligentAssigned.length > 0 ? Math.round(totalScore / intelligentAssigned.length) : 0;
  const avgRegistrationProgress = intelligentAssigned.length > 0 ? Math.round(totalReg / intelligentAssigned.length) : 0;

  console.log(`\n============================================================`);
  console.log(`📊 COUNSELOR INTELLIGENCE SUMMARY BAR (REAL DATA)`);
  console.log(`============================================================`);
  console.log(`Assigned Students: ${intelligentAssigned.length}`);
  console.log(`🔴 High Priority: ${highPriorityCount}`);
  console.log(`🟡 Medium Priority: ${mediumPriorityCount}`);
  console.log(`🟢 Low Priority: ${lowPriorityCount}`);
  console.log(`Average Engagement: ${avgEngagement} / 100`);
  console.log(`Average Registration: ${avgRegistrationProgress}%`);
  console.log(`============================================================\n`);

  await mongoose.disconnect();
}

testCounselorDashboardData();
