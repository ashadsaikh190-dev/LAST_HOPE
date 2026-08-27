const mongoose = require('mongoose');
const config = require('../config/env');
const User = require('../models/User');
const Program = require('../models/Program');
const StudentPersona = require('../models/StudentPersona');
const Student = require('../models/Student');
const Application = require('../models/Application');
const CounselorCase = require('../models/CounselorCase');

async function checkCases() {
  await mongoose.connect(config.MONGODB_URI);
  const cases = await CounselorCase.find().populate('student').lean();
  console.log(`Total CounselorCases in DB: ${cases.length}\n`);
  for (const c of cases) {
    console.log(`Case ID: ${c.caseId} | Status: ${c.status} | Priority: ${c.priority} | Category: ${c.category}`);
    console.log(`  Tracking ID: ${c.trackingId} | Summary: ${c.summary}`);
    console.log(`  AI Reason: ${c.aiReason}`);
    console.log(`  Recommended Action: ${c.recommendedAction}`);
    console.log('');
  }
  await mongoose.disconnect();
}

checkCases();
