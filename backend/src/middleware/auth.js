const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const config = require('../config/env');
const { sendError } = require('../utils/responseHandler');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return sendError(res, 'Not authorized to access this route. Missing token.', 401, 'AUTHORIZATION_ERROR');
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return sendError(res, 'The user belonging to this token no longer exists.', 401, 'AUTHORIZATION_ERROR');
    }

    if (!user.isActive) {
      return sendError(res, 'User account is deactivated.', 403, 'AUTHORIZATION_ERROR');
    }

    req.user = user;

    // If role is STUDENT, fetch and attach student profile
    if (user.role === 'STUDENT') {
      const student = await Student.findOne({ user: user._id });
      if (student) {
        req.student = student;
        req.trackingId = student.trackingId;
      }
    }

    next();
  } catch (error) {
    return sendError(res, 'Invalid or expired token.', 401, 'AUTHORIZATION_ERROR', error.message);
  }
};

module.exports = {
  protect,
};
