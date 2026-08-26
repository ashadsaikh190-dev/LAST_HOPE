const Student = require('../models/Student');
const { generateTrackingId } = require('../utils/idGenerator');

/**
 * Generates a guaranteed unique, permanent Student Tracking ID
 * Example: STU-2026-8F42K
 */
const generateUniqueTrackingId = async () => {
  let isUnique = false;
  let trackingId = '';
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    trackingId = generateTrackingId();
    const existing = await Student.findOne({ trackingId });
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Failed to generate a unique Student Tracking ID after 10 attempts');
  }

  return trackingId;
};

module.exports = {
  generateUniqueTrackingId,
};
