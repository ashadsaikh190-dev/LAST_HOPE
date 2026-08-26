const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const StudentPersona = require('../models/StudentPersona');
const Lead = require('../models/Lead');
const config = require('../config/env');
const { ROLES, LIFECYCLE_STAGES } = require('../config/constants');
const { generateUniqueTrackingId } = require('../services/trackingIdService');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');
const { protect } = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const generateToken = (id) => {
  return jwt.sign({ id }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
};

/**
 * @route   POST /api/auth/register
 * @desc    Register new student with permanent Student Tracking ID
 */
router.post('/register', authLimiter, validateRegistration, async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, password, source = 'WEBSITE_FORM', interestedProgramId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return sendError(res, 'An account with this email address already exists. Please log in.', 400, 'USER_EXISTS');
    }

    // 1. Generate permanent unique Tracking ID
    const trackingId = await generateUniqueTrackingId();

    // 2. Create User Record
    const user = await User.create({
      name: `${firstName} ${lastName}`.trim(),
      email: email.toLowerCase(),
      phone: phone || '',
      password,
      role: ROLES.STUDENT,
      trackingId,
    });

    // 3. Create Student Profile
    const student = await Student.create({
      trackingId,
      user: user._id,
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone: phone || '',
      currentStage: LIFECYCLE_STAGES.REGISTERED,
      selectedProgram: interestedProgramId || null,
    });

    // 4. Create Initial Persona
    const persona = await StudentPersona.create({
      student: student._id,
      trackingId,
      intentLevel: 'HIGH',
      engagementLevel: 'PROACTIVE',
      currentStage: LIFECYCLE_STAGES.REGISTERED,
    });

    student.persona = persona._id;
    await student.save();

    // 5. Ingest Lead
    await Lead.create({
      trackingId,
      student: student._id,
      name: `${firstName} ${lastName}`,
      email: email.toLowerCase(),
      phone: phone || '',
      source,
      interestedProgram: interestedProgramId || null,
      status: 'CONVERTED',
    });

    // 6. Log Audit
    await logAudit({
      actorId: user._id,
      actorType: 'STUDENT',
      studentId: student._id,
      trackingId,
      action: 'STUDENT_REGISTERED',
      result: 'SUCCESS',
      metadata: { email: student.email, source },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // 7. Dispatch Welcome Notification
    await createNotification({
      studentId: student._id,
      trackingId,
      type: 'EMAIL',
      title: 'Welcome to GIET University Admissions',
      content: `Welcome ${firstName}! Your registration is complete. Your permanent Student Tracking ID is ${trackingId}. Keep this ID safe to track your entire admissions journey.`,
      recipient: student.email,
    });

    const token = generateToken(user._id);

    return sendSuccess(
      res,
      {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          trackingId,
        },
        student: {
          id: student._id,
          trackingId: student.trackingId,
          firstName: student.firstName,
          lastName: student.lastName,
          currentStage: student.currentStage,
        },
      },
      'Registration successful. Tracking ID generated.',
      201
    );
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT token
 */
router.post('/login', authLimiter, validateLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return sendError(res, 'Invalid email or password credentials.', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      return sendError(res, 'Your account has been deactivated. Please contact admissions support.', 403, 'ACCOUNT_INACTIVE');
    }

    user.lastLoginAt = new Date();
    await user.save();

    let studentData = null;
    if (user.role === ROLES.STUDENT) {
      studentData = await Student.findOne({ user: user._id }).populate('selectedProgram currentApplication');
    }

    const token = generateToken(user._id);

    await logAudit({
      actorId: user._id,
      actorType: user.role,
      studentId: studentData?._id || null,
      trackingId: user.trackingId || null,
      action: 'USER_LOGIN',
      result: 'SUCCESS',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(
      res,
      {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          trackingId: user.trackingId || studentData?.trackingId,
        },
        student: studentData,
      },
      'Login successful'
    );
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user session
 */
router.get('/me', protect, async (req, res, next) => {
  try {
    let studentData = null;
    if (req.user.role === ROLES.STUDENT) {
      studentData = await Student.findOne({ user: req.user._id }).populate('selectedProgram currentApplication persona');
    }

    return sendSuccess(res, {
      user: req.user,
      student: studentData,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
