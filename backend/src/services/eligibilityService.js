const EligibilityResult = require('../models/EligibilityResult');
const Application = require('../models/Application');
const Program = require('../models/Program');
const Student = require('../models/Student');
const { ELIGIBILITY_STATUS, LIFECYCLE_STAGES } = require('../config/constants');
const { transitionStudentStage } = require('./stateMachineService');

/**
 * Deterministic Eligibility Engine
 * Evaluates candidate qualifications against institutional program requirements
 */
const evaluateEligibility = async (applicationId) => {
  const application = await Application.findById(applicationId).populate('program student');
  if (!application) {
    throw new Error(`Application with ID ${applicationId} not found`);
  }

  const program = application.program;
  if (!program) {
    throw new Error('Application does not have a linked program');
  }

  const academic = application.academicDetails || {};
  const criteria = program.eligibilityCriteria || {};
  const evaluations = [];
  let isAllPassed = true;

  // 1. 10th Standard Minimum Percentage
  const minTenth = criteria.minTenthMarks || 50;
  const actualTenth = academic.tenthPercentage || 0;
  const passedTenth = actualTenth >= minTenth;
  evaluations.push({
    criterion: `10th Grade Percentage (Minimum: ${minTenth}%)`,
    requiredValue: `${minTenth}%`,
    actualValue: `${actualTenth}%`,
    isPassed: passedTenth,
    remarks: passedTenth ? 'Satisfied' : `Shortfall of ${(minTenth - actualTenth).toFixed(1)}%`,
  });
  if (!passedTenth) isAllPassed = false;

  // 2. 12th Standard Minimum Percentage
  const minTwelfth = criteria.minTwelfthMarks || 60;
  const actualTwelfth = academic.twelfthPercentage || 0;
  const passedTwelfth = actualTwelfth >= minTwelfth;
  evaluations.push({
    criterion: `12th Grade Aggregate Percentage (Minimum: ${minTwelfth}%)`,
    requiredValue: `${minTwelfth}%`,
    actualValue: `${actualTwelfth}%`,
    isPassed: passedTwelfth,
    remarks: passedTwelfth ? 'Satisfied' : `Shortfall of ${(minTwelfth - actualTwelfth).toFixed(1)}%`,
  });
  if (!passedTwelfth) isAllPassed = false;

  // 3. Stream Check
  if (criteria.preferredStream && academic.twelfthStream) {
    const streamPassed =
      criteria.preferredStream.toLowerCase() === 'any' ||
      academic.twelfthStream.toLowerCase().includes(criteria.preferredStream.toLowerCase());
    evaluations.push({
      criterion: `Eligible Stream (${criteria.preferredStream})`,
      requiredValue: criteria.preferredStream,
      actualValue: academic.twelfthStream,
      isPassed: streamPassed,
      remarks: streamPassed ? 'Satisfied' : 'Stream does not match primary requirement',
    });
    if (!streamPassed) isAllPassed = false;
  }

  // 4. Application Deadline Check
  if (program.applicationDeadline) {
    const isBeforeDeadline = new Date() <= new Date(program.applicationDeadline);
    evaluations.push({
      criterion: 'Application Submitted Before Deadline',
      requiredValue: new Date(program.applicationDeadline).toLocaleDateString(),
      actualValue: new Date().toLocaleDateString(),
      isPassed: isBeforeDeadline,
      remarks: isBeforeDeadline ? 'On Time' : 'Submitted after deadline',
    });
    if (!isBeforeDeadline) isAllPassed = false;
  }

  const finalStatus = isAllPassed ? ELIGIBILITY_STATUS.ELIGIBLE : ELIGIBILITY_STATUS.NOT_ELIGIBLE;
  const overallScore = Math.round(
    ((actualTenth + actualTwelfth) / 2) * 10
  ) / 10;

  // Store Result
  const eligibilityResult = await EligibilityResult.findOneAndUpdate(
    { application: application._id },
    {
      application: application._id,
      student: application.student._id,
      program: program._id,
      status: finalStatus,
      evaluations,
      overallScore,
      checkedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  // If eligible and current stage allows, advance lifecycle
  if (finalStatus === ELIGIBILITY_STATUS.ELIGIBLE) {
    const nextStage = application.isPaymentRequired
      ? LIFECYCLE_STAGES.PAYMENT_PENDING
      : LIFECYCLE_STAGES.ADMISSION_REVIEW;

    await transitionStudentStage({
      studentId: application.student._id,
      targetStage: nextStage,
      actorId: 'ELIGIBILITY_ENGINE',
      actorType: 'SYSTEM',
      reason: 'Automated eligibility verification passed all criteria',
    });
  }

  return eligibilityResult;
};

module.exports = {
  evaluateEligibility,
};
