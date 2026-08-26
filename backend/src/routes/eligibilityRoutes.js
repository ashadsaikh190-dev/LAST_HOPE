const express = require('express');
const router = express.Router();
const EligibilityResult = require('../models/EligibilityResult');
const Application = require('../models/Application');
const { protect } = require('../middleware/auth');
const { evaluateEligibility } = require('../services/eligibilityService');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * @route   GET /api/eligibility/:applicationId
 * @desc    Get or calculate eligibility for an application
 */
router.get('/:applicationId', protect, async (req, res, next) => {
  try {
    let result = await EligibilityResult.findOne({ application: req.params.applicationId })
      .populate('program');

    if (!result) {
      // Calculate eligibility on the fly
      result = await evaluateEligibility(req.params.applicationId);
    }

    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/eligibility/:applicationId/evaluate
 * @desc    Force re-evaluation of eligibility rules
 */
router.post('/:applicationId/evaluate', protect, async (req, res, next) => {
  try {
    const result = await evaluateEligibility(req.params.applicationId);
    return sendSuccess(res, result, 'Eligibility evaluation complete');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
