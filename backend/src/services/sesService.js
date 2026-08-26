const { SendEmailCommand } = require('@aws-sdk/client-ses');
const { sesClient, isAwsConfigured } = require('../config/aws');
const config = require('../config/env');
const { assertServiceAllowed, incrementUsageCounter } = require('./costProtectionService');
const { withRetryProtection } = require('../utils/retryHelper');
const { executeWithIdempotency } = require('../utils/idempotency');

/**
 * Sends an email using Amazon SES (or development mock fallback)
 * Records the exact SES Message ID and delivery state
 */
const sendSesEmail = async ({ to, subject, htmlBody, textBody }) => {
  if (!to) {
    throw new Error('Recipient email address is required');
  }

  // Generate idempotency key for email to avoid sending duplicate emails
  const emailHash = Buffer.from(`${to}-${subject}-${(textBody || htmlBody || '').slice(0, 50)}`).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
  const idempotencyKey = `email:${to}:${emailHash}`;

  return await executeWithIdempotency({
    key: idempotencyKey,
    action: 'SES_EMAIL_DISPATCH',
    ttlSeconds: 3600, // 1 hour deduplication window
    executeFn: async () => {
      let isSesPermitted = false;
      try {
        await assertServiceAllowed('ses', 'Amazon SES Email Dispatch');
        isSesPermitted = true;
      } catch (cpErr) {
        console.warn(`[SES Cost Protection Active] ${cpErr.message}. Falling back to local dispatch.`);
      }

      if (isAwsConfigured && config.AWS_SES_FROM_EMAIL && isSesPermitted) {
        try {
          const result = await withRetryProtection({
            operationName: 'AWS_SES_SEND_EMAIL',
            maxRetries: 3,
            fn: async (attempt) => {
              const params = {
                Source: config.AWS_SES_FROM_EMAIL,
                Destination: {
                  ToAddresses: Array.isArray(to) ? to : [to],
                },
                Message: {
                  Subject: { Data: subject, Charset: 'UTF-8' },
                  Body: {
                    Html: { Data: htmlBody || textBody, Charset: 'UTF-8' },
                    Text: { Data: textBody || subject, Charset: 'UTF-8' },
                  },
                },
              };

              const sesRes = await sesClient.send(new SendEmailCommand(params));
              await incrementUsageCounter('emailsSent');
              return sesRes;
            },
          });

          console.log(`[Amazon SES] Email sent to ${to}. MessageId: ${result.MessageId}`);
          return {
            success: true,
            messageId: result.MessageId,
            provider: 'AMAZON_SES',
          };
        } catch (err) {
          console.error(`[Amazon SES Error] Failed to send email to ${to}: ${err.message}`);
          return {
            success: false,
            error: err.message,
            provider: 'AMAZON_SES',
          };
        }
      }

      // Development/Local Fallback Logger or Cost-Protection Paused Mode
      const mockId = `mock-ses-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      console.log(`[DEV Email Dispatch] (SES Offline or Paused for Cost Protection)\nTo: ${to}\nSubject: ${subject}\nBody:\n${textBody || htmlBody}\n---`);
      return {
        success: true,
        messageId: mockId,
        provider: 'LOCAL_MOCK_DISPATCH',
      };
    },
  });
};

module.exports = {
  sendSesEmail,
};

