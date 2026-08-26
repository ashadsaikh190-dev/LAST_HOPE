const mongoose = require('mongoose');
const { PAYMENT_STATUS } = require('../config/constants');

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    trackingId: {
      type: String,
      required: true,
      index: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    feeType: {
      type: String,
      enum: ['APPLICATION_FEE', 'SEAT_ACCEPTANCE_FEE', 'TUITION_FEE_SEM1', 'REGISTRATION_FEE'],
      default: 'APPLICATION_FEE',
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    paymentGateway: {
      type: String,
      default: 'RAZORPAY_AWS_PAY',
    },
    transactionReference: {
      type: String,
      sparse: true,
    },
    receiptNumber: {
      type: String,
      sparse: true,
    },
    paidAt: {
      type: Date,
    },
    failureReason: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Payment', paymentSchema);
