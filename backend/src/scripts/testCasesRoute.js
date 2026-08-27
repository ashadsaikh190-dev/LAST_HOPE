const mongoose = require('mongoose');
const config = require('../config/env');
const User = require('../models/User');
const Program = require('../models/Program');
const StudentPersona = require('../models/StudentPersona');
const Student = require('../models/Student');
const Application = require('../models/Application');
const CounselorCase = require('../models/CounselorCase');

async function testCasesAPI() {
  await mongoose.connect(config.MONGODB_URI);
  try {
    const filter = { status: 'OPEN' };
    const cases = await CounselorCase.find(filter)
      .populate('student application assignedCounselor')
      .sort({ createdAt: -1 });
    console.log(`Successfully fetched ${cases.length} cases`);
    console.log('Sample populated case student:', cases[0]?.student?.firstName);
  } catch (err) {
    console.error('Error fetching cases:', err);
  }
  await mongoose.disconnect();
}

testCasesAPI();
