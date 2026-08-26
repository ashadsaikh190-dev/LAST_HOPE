const express = require('express');
const router = express.Router();
const Program = require('../models/Program');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { ROLES } = require('../config/constants');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * @route   GET /api/programs
 * @desc    Get all active academic programs
 */
router.get('/', async (req, res, next) => {
  try {
    const programs = await Program.find({ isActive: true }).sort({ department: 1, name: 1 });
    return sendSuccess(res, programs);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/programs/:id
 * @desc    Get program by ID or Program Code
 */
router.get('/:id', async (req, res, next) => {
  try {
    let program;
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      program = await Program.findById(req.params.id);
    } else {
      program = await Program.findOne({ code: req.params.id.toUpperCase() });
    }

    if (!program) {
      return sendError(res, 'Program not found', 404, 'NOT_FOUND');
    }

    return sendSuccess(res, program);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/programs (Admin Only)
 * @desc    Create new program
 */
router.post('/', protect, authorize(ROLES.ADMIN), async (req, res, next) => {
  try {
    const program = await Program.create(req.body);
    return sendSuccess(res, program, 'Program created successfully', 201);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/programs/:id (Admin Only)
 * @desc    Update program
 */
router.put('/:id', protect, authorize(ROLES.ADMIN), async (req, res, next) => {
  try {
    const program = await Program.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!program) {
      return sendError(res, 'Program not found', 404, 'NOT_FOUND');
    }
    return sendSuccess(res, program, 'Program updated successfully');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
