const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { ROLES } = require('../config/constants');
const { createPaymentOrder, confirmPaymentSuccess } = require('../services/paymentService');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * @route   POST /api/payments/create
 * @desc    Create an idempotent payment order for application fee
 */
router.post('/create', protect, authorize(ROLES.STUDENT), async (req, res, next) => {
  try {
    const student = req.student;
    const { applicationId, feeType = 'APPLICATION_FEE', idempotencyKey } = req.body;

    if (!applicationId) {
      return sendError(res, 'applicationId is required', 400, 'VALIDATION_ERROR');
    }

    const { payment, isNew } = await createPaymentOrder({
      studentId: student._id,
      applicationId,
      feeType,
      idempotencyKey,
    });

    return sendSuccess(
      res,
      payment,
      isNew ? 'Payment order created' : 'Existing pending payment returned',
      isNew ? 201 : 200
    );
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/payments/:id/simulate-checkout
 * @desc    Simulate or complete payment gateway transaction
 */
router.post('/:id/simulate-checkout', protect, authorize(ROLES.STUDENT), async (req, res, next) => {
  try {
    const { transactionReference } = req.body;
    const payment = await Payment.findOne({
      $or: [{ paymentId: req.params.id }, { _id: req.params.id }],
    });

    if (!payment) {
      return sendError(res, 'Payment record not found', 404, 'NOT_FOUND');
    }

    const result = await confirmPaymentSuccess({
      paymentId: payment.paymentId,
      transactionReference: transactionReference || `TXN-SIM-${Date.now()}`,
      actorId: req.user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(
      res,
      result.payment,
      result.alreadyProcessed
        ? 'Payment was already confirmed.'
        : 'Payment successfully processed and verified by backend.'
    );
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/payments/:id
 * @desc    Get payment details
 */
router.get('/:id', protect, async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      $or: [{ paymentId: req.params.id }, { _id: req.params.id }],
    }).populate('application student');

    if (!payment) {
      return sendError(res, 'Payment not found', 404, 'NOT_FOUND');
    }

    return sendSuccess(res, payment);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
