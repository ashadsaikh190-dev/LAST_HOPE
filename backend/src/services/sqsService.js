const { SendMessageCommand } = require('@aws-sdk/client-sqs');
const { sqsClient, isAwsConfigured } = require('../config/aws');
const config = require('../config/env');
const { assertServiceAllowed, incrementUsageCounter } = require('./costProtectionService');
const { withRetryProtection } = require('../utils/retryHelper');
const { executeWithIdempotency } = require('../utils/idempotency');

/**
 * Dispatches an asynchronous document verification job to Amazon SQS
 */
const queueDocumentProcessing = async (payload) => {
  const idempotencyKey = `sqs:doc-processing:${payload.documentVersionId || payload.documentId || payload.trackingId}`;

  return await executeWithIdempotency({
    key: idempotencyKey,
    action: 'SQS_QUEUE_DOCUMENT_PROCESSING',
    executeFn: async () => {
      let isSqsPermitted = false;
      try {
        await assertServiceAllowed('sqs', 'Amazon SQS Queue Dispatch');
        isSqsPermitted = true;
      } catch (cpErr) {
        console.warn(`[SQS Cost Protection Active] ${cpErr.message}. Switching to local in-memory worker.`);
      }

      if (isAwsConfigured && config.AWS_SQS_DOCUMENT_QUEUE_URL && isSqsPermitted) {
        try {
          const response = await withRetryProtection({
            operationName: 'AWS_SQS_SEND_MESSAGE',
            maxRetries: 3,
            trackingId: payload.trackingId,
            fn: async (attempt) => {
              const command = new SendMessageCommand({
                QueueUrl: config.AWS_SQS_DOCUMENT_QUEUE_URL,
                MessageBody: JSON.stringify(payload),
                MessageAttributes: {
                  trackingId: { DataType: 'String', StringValue: payload.trackingId },
                  documentType: { DataType: 'String', StringValue: payload.documentType },
                },
              });
              const res = await sqsClient.send(command);
              await incrementUsageCounter('sqsMessages');
              return res;
            },
          });

          console.log(`[Amazon SQS] Document processing job queued. MessageId: ${response.MessageId}`);
          return { success: true, messageId: response.MessageId, provider: 'AMAZON_SQS' };
        } catch (err) {
          console.error(`[Amazon SQS Error] ${err.message}`);
        }
      }

      // Local asynchronous processing fallback (Active when SQS is not configured or blocked for cost protection)
      console.log(`[Local Queue Worker] Processing document job asynchronously for ${payload.trackingId}...`);
      setImmediate(async () => {
        try {
          const { verifyDocumentWithTextract } = require('./textractService');
          await verifyDocumentWithTextract(payload);
        } catch (error) {
          console.error(`[Local Queue Worker Error] Failed processing: ${error.message}`);
        }
      });

      return { success: true, messageId: `local-job-${Date.now()}`, provider: 'LOCAL_WORKER' };
    },
  });
};

module.exports = {
  queueDocumentProcessing,
};

