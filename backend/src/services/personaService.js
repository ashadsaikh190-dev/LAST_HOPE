const StudentPersona = require('../models/StudentPersona');
const Student = require('../models/Student');
const Document = require('../models/Document');
const Application = require('../models/Application');
const { DOCUMENT_STATUS } = require('../config/constants');

/**
 * Updates dynamic persona based on real database records and interactions
 */
const updateStudentPersona = async (studentId, delta = {}) => {
  const student = await Student.findById(studentId).populate('selectedProgram');
  if (!student) return null;

  let persona = await StudentPersona.findOne({ student: studentId });
  if (!persona) {
    persona = new StudentPersona({
      student: studentId,
      trackingId: student.trackingId,
      currentStage: student.currentStage,
    });
  }

  // Derive Academic Profile Category
  const twPct = student.academicProfile?.twelfthMarks || 0;
  let strengthCategory = 'UNKNOWN';
  if (twPct >= 85) strengthCategory = 'HIGH_ACHIEVER';
  else if (twPct >= 65) strengthCategory = 'STANDARD';
  else if (twPct >= 50) strengthCategory = 'BORDERLINE';
  else if (twPct > 0) strengthCategory = 'AT_RISK';

  // Derive Document Risk
  const docs = await Document.find({ student: studentId });
  const hasMismatch = docs.some(
    (d) => d.status === DOCUMENT_STATUS.MISMATCH || d.status === DOCUMENT_STATUS.REJECTED
  );
  const documentRisk = hasMismatch ? 'HIGH_RISK' : docs.length > 0 ? 'LOW' : 'MODERATE';

  // Update Persona Fields
  persona.academicProfile = {
    strengthCategory,
    twelfthPercentage: twPct,
    stream: student.academicProfile?.twelfthStream || '',
  };

  if (student.selectedProgram) {
    persona.programInterest = {
      primaryProgram: student.selectedProgram.name,
      department: student.selectedProgram.department,
    };
  }

  persona.documentRisk = documentRisk;
  persona.currentStage = student.currentStage;
  persona.lastInteractedAt = new Date();

  // Apply delta overrides if provided by AI or interaction
  if (delta.intentLevel) persona.intentLevel = delta.intentLevel;
  if (delta.feeConcern) persona.feeConcern = delta.feeConcern;
  if (delta.engagementLevel) persona.engagementLevel = delta.engagementLevel;
  if (delta.majorConcern) {
    if (!persona.majorConcerns.includes(delta.majorConcern)) {
      persona.majorConcerns.push(delta.majorConcern);
    }
  }

  await persona.save();

  // Link persona to student if not already linked
  if (!student.persona) {
    student.persona = persona._id;
    await student.save();
  }

  return persona;
};

module.exports = {
  updateStudentPersona,
};
