const mongoose = require('mongoose');
const config = require('../config/env');
const Student = require('../models/Student');
const User = require('../models/User');

async function check() {
  await mongoose.connect(config.MONGODB_URI);
  const counselors = await User.find({ role: 'COUNSELOR' }).lean();
  console.log('Counselors:', counselors.map(c => ({ id: c._id, name: c.name, email: c.email })));
  
  const assignedCounts = await Promise.all(counselors.map(async c => {
    const count = await Student.countDocuments({ assignedCounselor: c._id });
    return { counselor: c.name, email: c.email, count };
  }));
  console.log('Assigned counts:', assignedCounts);
  const unassigned = await Student.countDocuments({ $or: [{ assignedCounselor: { $exists: false } }, { assignedCounselor: null }] });
  const total = await Student.countDocuments();
  console.log('Total students:', total, '| Unassigned / null:', unassigned);
  await mongoose.disconnect();
}
check();
