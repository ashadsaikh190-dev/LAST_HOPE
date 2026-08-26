const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const config = require('../config/env');
const { isAwsConfigured } = require('../config/aws');
const { withRetryProtection } = require('../utils/retryHelper');

const snsClient = isAwsConfigured
  ? new SNSClient({
      region: config.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null;

/**
 * Format phone number to E.164 standard (e.g., +919556562197)
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  const cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.length === 10) return `+91${cleaned}`;
  if (cleaned.length === 12 && cleaned.startsWith('91')) return `+${cleaned}`;
  return `+${cleaned}`;
};

/**
 * Sends transactional SMS via Amazon SNS
 */
const sendSnsSms = async ({ phoneNumber, message, senderId = 'GIETUNI' }) => {
  const formattedPhone = formatPhoneNumber(phoneNumber);
  if (!formattedPhone) {
    return { success: false, error: 'Invalid phone number' };
  }

  if (!isAwsConfigured || !snsClient) {
    console.log(`[Mock SMS Mode] To ${formattedPhone}: "${message}"`);
    return {
      success: true,
      simulated: true,
      messageId: `MOCK-SMS-${Date.now()}`,
      phone: formattedPhone,
    };
  }

  try {
    const result = await withRetryProtection({
      operationName: 'AWS_SNS_SEND_SMS',
      maxRetries: 2,
      fn: async () => {
        const command = new PublishCommand({
          PhoneNumber: formattedPhone,
          Message: message,
          MessageAttributes: {
            'AWS.SNS.SMS.SMSType': {
              DataType: 'String',
              StringValue: 'Transactional',
            },
          },
        });

        const response = await snsClient.send(command);
        console.log(`[Amazon SNS SMS] Successfully dispatched SMS to ${formattedPhone}. MessageId: ${response.MessageId}`);
        return {
          success: true,
          messageId: response.MessageId,
          phone: formattedPhone,
        };
      },
    });
    return result;
  } catch (err) {
    console.error(`[Amazon SNS SMS Error] Failed to send SMS to ${formattedPhone}:`, err.message);
    return {
      success: false,
      error: err.message,
      phone: formattedPhone,
    };
  }
};

module.exports = {
  sendSnsSms,
  formatPhoneNumber,
};
