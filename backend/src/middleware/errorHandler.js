const logger = require('../utils/logger');
const { sendError } = require('../utils/responseHandler');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let errorCode = err.code || 'SYSTEM_ERROR';
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose / MongoDB Duplicate Key Error (E11000)
  if (err.code === 11000) {
    statusCode = 400;
    errorCode = 'DUPLICATE_KEY_ERROR';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with this ${field} already exists.`;
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
  }

  // Handle JWT Error
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'AUTHORIZATION_ERROR';
    message = 'Invalid or expired authorization token.';
  }

  // Handle AWS Cost Protection Circuit Breaker
  if (err.name === 'AwsCostProtectionError') {
    statusCode = 429;
    errorCode = 'AWS_COST_PROTECTION_ACTIVE';
    message = "AWS cost protection is currently active. This operation has temporarily been paused to protect the institution's AWS budget.";
  }

  // Log error asynchronously
  logger.error(message, {
    category: errorCode,
    stack: err.stack,
    endpoint: req.originalUrl,
    httpMethod: req.method,
    trackingId: req.trackingId || null,
  });

  return sendError(res, message, statusCode, errorCode);
};

module.exports = errorHandler;
