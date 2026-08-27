const mongoose = require('mongoose');
const config = require('../config/env');
const Program = require('../models/Program');
const StudentPersona = require('../models/StudentPersona');
const Student = require('../models/Student');
const { calculateStudentIntelligence } = require('../services/intelligenceService');

async function checkOutput() {
  await mongoose.connect(config.MONGODB_URI);
  const students = await Student.find().populate('selectedProgram currentApplication').lean();
  console.log(`\n============================================================`);
  console.log(`📊 REAL STUDENT INTELLIGENCE OUTPUT (TOTAL: ${students.length})`);
  console.log(`============================================================\n`);

  for (const s of students.slice(0, 10)) {
    const intel = await calculateStudentIntelligence(s);
    console.log(`Candidate: ${intel.firstName} ${intel.lastName} (${intel.trackingId})`);
    console.log(`  Stage: ${intel.currentStage}`);
    console.log(`  Registration Progress: ${intel.registrationProgress}%`);
    console.log(`  Website Visits: ${intel.visitCount} | Last Activity: ${intel.lastActivityAt.toISOString()}`);
    console.log(`  Priority: ${intel.priority} | Reason: "${intel.priorityReason}"`);
    console.log(`  Engagement Score: ${intel.engagementScore} / 100 (${intel.engagementCategory})\n`);
  }

  await mongoose.disconnect();
}

checkOutput();
