const crypto = require('crypto');

/**
 * Deterministic & cryptographically strong ID generators for the entire platform
 */

const generateTrackingId = () => {
  const year = new Date().getFullYear();
  const randomChars = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
  return `STU-${year}-${randomChars}`;
};

const generateApplicationId = () => {
  const year = new Date().getFullYear();
  const randomChars = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
  return `APP-${year}-${randomChars}`;
};

const generateCaseId = () => {
  const year = new Date().getFullYear();
  const randomChars = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
  return `CASE-${year}-${randomChars}`;
};

const generatePaymentId = () => {
  const year = new Date().getFullYear();
  const randomChars = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 7);
  return `PAY-${year}-${randomChars}`;
};

module.exports = {
  generateTrackingId,
  generateApplicationId,
  generateCaseId,
  generatePaymentId,
};
