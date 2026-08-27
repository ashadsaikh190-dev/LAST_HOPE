const mongoose = require('mongoose');
const config = require('../config/env');
const Student = require('../models/Student');
const User = require('../models/User');

async function syncCounselorAssignments() {
  await mongoose.connect(config.MONGODB_URI);
  const counselor = await User.findOne({ role: 'COUNSELOR' });
  if (!counselor) {
    console.log('No counselor found');
    process.exit(1);
  }

  const result = await Student.updateMany(
    { $or: [{ assignedCounselor: null }, { assignedCounselor: { $exists: false } }] },
    { $set: { assignedCounselor: counselor._id } }
  );

  console.log(`✅ Assigned ${result.modifiedCount} unassigned students to counselor: ${counselor.name} (${counselor.email})`);
  const totalAssigned = await Student.countDocuments({ assignedCounselor: counselor._id });
  console.log(`Total students now assigned to counselor: ${totalAssigned}`);

  await mongoose.disconnect();
}

syncCounselorAssignments();
