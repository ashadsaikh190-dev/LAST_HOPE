const { sendError } = require('../utils/responseHandler');

const validateRegistration = (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;
  if (!firstName || !lastName || !email || !password) {
    return sendError(res, 'firstName, lastName, email, and password are required', 400, 'VALIDATION_ERROR');
  }
  if (password.length < 6) {
    return sendError(res, 'Password must be at least 6 characters long', 400, 'VALIDATION_ERROR');
  }
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    return sendError(res, 'Please provide a valid email address', 400, 'VALIDATION_ERROR');
  }
  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return sendError(res, 'Email and password are required', 400, 'VALIDATION_ERROR');
  }
  next();
};

const validateApplication = (req, res, next) => {
  const { programId, personalDetails, academicDetails } = req.body;
  if (!programId) {
    return sendError(res, 'programId is required', 400, 'VALIDATION_ERROR');
  }
  if (!personalDetails?.fullName || !personalDetails?.dateOfBirth || !personalDetails?.phone) {
    return sendError(res, 'Personal details (fullName, dateOfBirth, phone) are required', 400, 'VALIDATION_ERROR');
  }
  if (!academicDetails?.tenthPercentage || !academicDetails?.twelfthPercentage) {
    return sendError(res, 'Academic details (tenthPercentage, twelfthPercentage) are required', 400, 'VALIDATION_ERROR');
  }
  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateApplication,
};
