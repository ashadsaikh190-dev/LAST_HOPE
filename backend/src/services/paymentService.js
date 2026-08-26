const Payment = require('../models/Payment');
const Application = require('../models/Application');
const Student = require('../models/Student');
const Program = require('../models/Program');
const { PAYMENT_STATUS, LIFECYCLE_STAGES } = require('../config/constants');
const { generatePaymentId } = require('../utils/idGenerator');
const { transitionStudentStage } = require('./stateMachineService');
const { logAudit } = require('./auditService');
const { createNotification } = require('./notificationService');
const { emitToStudent, emitToCounselors } = require('../config/socket');

/**
 * Creates an idempotent Payment intent / order
 */
const createPaymentOrder = async ({
  studentId,
  applicationId,
  feeType = 'APPLICATION_FEE',
  idempotencyKey,
}) => {
  const application = await Application.findById(applicationId).populate('program');
  if (!application) {
    throw new Error('Application not found');
  }

  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error('Student not found');
  }

  // Check existing payment with idempotencyKey
  if (idempotencyKey) {
    const existing = await Payment.findOne({ idempotencyKey });
    if (existing) {
      return { payment: existing, isNew: false };
    }
  }

  const amount =
    feeType === 'APPLICATION_FEE'
      ? application.program?.applicationFee || 1000
      : application.program?.tuitionFee || 75000;

  const paymentId = generatePaymentId();
  const effectiveIdempotencyKey = idempotencyKey || `idem-${paymentId}`;

  const payment = await Payment.create({
    paymentId,
    idempotencyKey: effectiveIdempotencyKey,
    student: student._id,
    trackingId: student.trackingId,
    application: application._id,
    amount,
    currency: 'INR',
    feeType,
    status: PAYMENT_STATUS.PENDING,
    metadata: {
      programName: application.program?.name,
    },
  });

  return { payment, isNew: true };
};

/**
 * Server-authoritative Payment Confirmation / Webhook
 */
const confirmPaymentSuccess = async ({
  paymentId,
  transactionReference,
  actorId = 'PAYMENT_GATEWAY',
  ipAddress = '',
  userAgent = '',
}) => {
  const payment = await Payment.findOne({ paymentId }).populate('application student');
  if (!payment) {
    throw new Error(`Payment ${paymentId} not found`);
  }

  if (payment.status === PAYMENT_STATUS.SUCCESS) {
    return { payment, alreadyProcessed: true };
  }

  const receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  payment.status = PAYMENT_STATUS.SUCCESS;
  payment.transactionReference = transactionReference || `TXN-${Date.now()}`;
  payment.receiptNumber = receiptNumber;
  payment.paidAt = new Date();
  await payment.save();

  // Update Application
  await Application.findByIdAndUpdate(payment.application._id, {
    isPaymentCompleted: true,
  });

  // Log Audit
  await logAudit({
    actorId,
    actorType: 'WEBHOOK',
    studentId: payment.student._id,
    trackingId: payment.trackingId,
    action: 'PAYMENT_VERIFIED_SUCCESS',
    result: 'SUCCESS',
    metadata: {
      paymentId: payment.paymentId,
      amount: payment.amount,
      receiptNumber,
      transactionReference: payment.transactionReference,
    },
    ipAddress,
    userAgent,
  });

  // Advance lifecycle stage to ADMISSION_REVIEW
  await transitionStudentStage({
    studentId: payment.student._id,
    targetStage: LIFECYCLE_STAGES.ADMISSION_REVIEW,
    actorId: 'PAYMENT_SERVICE',
    actorType: 'SYSTEM',
    reason: 'Application fee received and verified',
  });

  // Send receipt notification
  await createNotification({
    studentId: payment.student._id,
    trackingId: payment.trackingId,
    type: 'EMAIL',
    title: 'Payment Confirmation & Receipt - GIET Admissions',
    content: `Thank you! Your payment of ₹${payment.amount.toLocaleString('en-IN')} has been received. Receipt Number: ${receiptNumber}. Your application is now under institutional admission review.`,
    recipient: payment.student.email,
  });

  // Emit real-time event
  emitToStudent(payment.trackingId, 'payment:success', {
    paymentId: payment.paymentId,
    amount: payment.amount,
    receiptNumber,
  });

  emitToCounselors('payment:received', {
    trackingId: payment.trackingId,
    amount: payment.amount,
    receiptNumber,
  });

  return { payment, alreadyProcessed: false };
};

module.exports = {
  createPaymentOrder,
  confirmPaymentSuccess,
};
