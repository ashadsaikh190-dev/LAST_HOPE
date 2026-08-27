const mongoose = require('mongoose');
const config = require('../config/env');
const Program = require('../models/Program');
const StudentPersona = require('../models/StudentPersona');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Document = require('../models/Document');
const AuditLog = require('../models/AuditLog');

async function inspectStudents() {
  await mongoose.connect(config.MONGODB_URI);
  const students = await Student.find().populate('selectedProgram currentApplication').lean();
  console.log(`Total students in DB: ${students.length}\n`);

  for (const s of students) {
    const app = await Application.findOne({ student: s._id }).lean();
    const docs = await Document.find({ student: s._id }).lean();
    const auditLogsCount = await AuditLog.countDocuments({ trackingId: s.trackingId });
    const latestAudit = await AuditLog.findOne({ trackingId: s.trackingId }).sort({ timestamp: -1 }).lean();

    console.log(`--- Student: ${s.firstName} ${s.lastName} (${s.trackingId}) ---`);
    console.log(`Stage: ${s.currentStage} | VisitCount in DB: ${s.visitCount}`);
    console.log(`App exists: ${Boolean(app)} | Docs count: ${docs.length} (Uploaded: ${docs.filter(d => d.status !== 'NOT_UPLOADED').length})`);
    console.log(`Audit Logs count: ${auditLogsCount} | Latest log: ${latestAudit ? latestAudit.timestamp : 'None'}`);
    console.log('');
  }
  await mongoose.disconnect();
}

inspectStudents();
