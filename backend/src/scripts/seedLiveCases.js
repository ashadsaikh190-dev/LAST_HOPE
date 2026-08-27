const mongoose = require('mongoose');
const config = require('../config/env');
const User = require('../models/User');
const Program = require('../models/Program');
const StudentPersona = require('../models/StudentPersona');
const Student = require('../models/Student');
const Application = require('../models/Application');
const CounselorCase = require('../models/CounselorCase');
const { generateCaseId } = require('../utils/idGenerator');
const { COUNSELOR_CASE_PRIORITY, COUNSELOR_CASE_CATEGORY, COUNSELOR_CASE_STATUS } = require('../config/constants');

async function seedLiveCases() {
  await mongoose.connect(config.MONGODB_URI);
  console.log('Connected to MongoDB');

  const counselor = await User.findOne({ role: 'COUNSELOR' });
  const rahul = await Student.findOne({ trackingId: 'STU-2026-9C543' });
  const raghav = await Student.findOne({ trackingId: 'STU-2026-1E428' });
  const santosh = await Student.findOne({ trackingId: 'STU-2026-7EB32' });

  const existingCount = await CounselorCase.countDocuments();
  if (existingCount === 0) {
    if (rahul) {
      await CounselorCase.create({
        caseId: generateCaseId(),
        student: rahul._id,
        trackingId: rahul.trackingId,
        priority: COUNSELOR_CASE_PRIORITY.HIGH,
        category: COUNSELOR_CASE_CATEGORY.FEE_WAIVER,
        status: COUNSELOR_CASE_STATUS.OPEN,
        summary: `Special Fee Waiver Request by ${rahul.firstName} ${rahul.lastName}`,
        aiReason: `Student declared annual family income of ₹1,80,000 and requested institutional financial fee concession.`,
        recommendedAction: `Verify family income certificate and approve fee concession under university aid policy.`,
        assignedCounselor: counselor?._id || null,
      });
      console.log(`✓ Created Fee Waiver escalation for ${rahul.firstName}`);
    }

    if (raghav) {
      await CounselorCase.create({
        caseId: generateCaseId(),
        student: raghav._id,
        trackingId: raghav.trackingId,
        priority: COUNSELOR_CASE_PRIORITY.HIGH,
        category: COUNSELOR_CASE_CATEGORY.DOCUMENT_AMBIGUITY,
        status: COUNSELOR_CASE_STATUS.OPEN,
        summary: `Transfer Certificate OCR Name Spelling Mismatch for ${raghav.firstName} ${raghav.lastName}`,
        aiReason: `Registration name is "${raghav.firstName} ${raghav.lastName}", but OCR extracted "Raghab Pradhan" from school certificate.`,
        recommendedAction: `Inspect government identity proof to approve phonetic spelling variation exception.`,
        assignedCounselor: counselor?._id || null,
      });
      console.log(`✓ Created Document Ambiguity escalation for ${raghav.firstName}`);
    }

    if (santosh) {
      await CounselorCase.create({
        caseId: generateCaseId(),
        student: santosh._id,
        trackingId: santosh.trackingId,
        priority: COUNSELOR_CASE_PRIORITY.MEDIUM,
        category: COUNSELOR_CASE_CATEGORY.HUMAN_REQUEST,
        status: COUNSELOR_CASE_STATUS.OPEN,
        summary: `Candidate Guidance on MBA Dual Specialization & Placements`,
        aiReason: `Student requested human counselor consultation regarding MBA Marketing & Finance career tracks and average packages.`,
        recommendedAction: `Reach out to candidate via phone/email to discuss MBA specializations and placement records.`,
        assignedCounselor: counselor?._id || null,
      });
      console.log(`✓ Created Guidance escalation for ${santosh.firstName}`);
    }
  } else {
    console.log(`Cases already present (${existingCount}). Skipping creation.`);
  }

  const finalTotal = await CounselorCase.countDocuments();
  console.log(`\n✅ Total Counselor Cases in DB: ${finalTotal}`);

  await mongoose.disconnect();
}

seedLiveCases();
