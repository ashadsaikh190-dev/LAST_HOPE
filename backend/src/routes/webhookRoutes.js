const express = require('express');
const router = express.Router();
const config = require('../config/env');
const { confirmPaymentSuccess } = require('../services/paymentService');
const { executeAiTool } = require('../services/aiToolService');
const Student = require('../models/Student');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * @route   POST /api/webhooks/payment
 * @desc    Idempotent payment gateway webhook receiver
 */
router.post('/payment', async (req, res, next) => {
  try {
    const { paymentId, transactionReference, event } = req.body;

    if (event === 'payment.captured' || event === 'PAYMENT_SUCCESS') {
      const result = await confirmPaymentSuccess({
        paymentId,
        transactionReference,
        actorId: 'PAYMENT_WEBHOOK',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return sendSuccess(res, result, 'Payment webhook processed successfully');
    }

    return sendSuccess(res, { ignored: true }, 'Event received');
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/webhooks/whatsapp
 * @desc    Meta WhatsApp Webhook Verification
 */
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.META_WEBHOOK_VERIFY_TOKEN) {
    console.log('[Meta WhatsApp Webhook] Webhook verified successfully');
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

/**
 * @route   POST /api/webhooks/whatsapp
 * @desc    Meta WhatsApp Message Ingestion
 */
router.post('/whatsapp', async (req, res, next) => {
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0]?.value;
      const message = change?.messages?.[0];

      if (message && message.type === 'text') {
        const fromNumber = message.from;
        const textBody = message.text?.body;

        // Lookup student by phone
        const student = await Student.findOne({
          phone: { $regex: new RegExp(fromNumber.slice(-10), 'i') },
        });

        if (student) {
          let conversation = await Conversation.findOne({
            student: student._id,
            channel: 'WHATSAPP',
            status: 'ACTIVE',
          });

          if (!conversation) {
            conversation = await Conversation.create({
              student: student._id,
              trackingId: student.trackingId,
              channel: 'WHATSAPP',
              status: 'ACTIVE',
            });
          }

          await Message.create({
            conversation: conversation._id,
            student: student._id,
            trackingId: student.trackingId,
            sender: 'STUDENT',
            content: textBody,
          });

          console.log(`[WhatsApp Ingestion] Message from ${fromNumber} (${student.trackingId}): "${textBody}"`);
        }
      }

      return res.sendStatus(200);
    }

    return res.sendStatus(404);
  } catch (error) {
    console.error(`[WhatsApp Webhook Error] ${error.message}`);
    return res.sendStatus(500);
  }
});

module.exports = router;
