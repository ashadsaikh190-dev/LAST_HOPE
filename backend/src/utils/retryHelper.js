const config = require('../config/env');
const { logAudit } = require('../services/auditService');

/**
 * Executes an asynchronous operation with capped retries and exponential backoff.
 * NEVER allows infinite retries. Maximum attempts = MAX_RETRIES (default 3).
 *
 * @param {Object} options
 * @param {Function} options.fn - Async function to execute (receives current attempt number)
 * @param {string} options.operationName - Descriptive name for logging and auditing
 * @param {number} [options.maxRetries] - Max retry count (defaults to env MAX_RETRIES)
 * @param {number} [options.initialDelayMs=400] - Initial delay in milliseconds
 * @param {number} [options.backoffFactor=2] - Exponential multiplier
 * @param {string} [options.trackingId] - Optional tracking ID for audit trail
 * @param {Function} [options.onDeadLetter] - Optional dead-letter handler called when all retries are exhausted
 * @returns {Promise<any>} Result of fn
 */
const withRetryProtection = async ({
  fn,
  operationName = 'AWS_OPERATION',
  maxRetries = config.MAX_RETRIES || 3,
  initialDelayMs = 400,
  backoffFactor = 2,
  trackingId = null,
  onDeadLetter = null,
}) => {
  let attempt = 1;
  let lastError = null;

  while (attempt <= maxRetries) {
    try {
      const result = await fn(attempt);
      return result;
    } catch (error) {
      lastError = error;
      console.warn(
        `[RetryProtection] ${operationName} failed on attempt ${attempt}/${maxRetries}: ${error.message}`
      );

      if (attempt >= maxRetries) {
        // Exceeded maximum retries - trigger Dead-Letter Handling
        console.error(
          `[RetryProtection EXHAUSTED] ${operationName} failed permanently after ${maxRetries} attempts. Routing to failure log / DLQ.`
        );

        await logAudit({
          actorId: 'RETRY_ENGINE',
          actorType: 'SYSTEM',
          trackingId,
          action: `${operationName}_RETRIES_EXHAUSTED`,
          result: 'FAILURE',
          metadata: {
            operationName,
            maxRetries,
            finalError: error.message,
          },
        });

        if (typeof onDeadLetter === 'function') {
          try {
            await onDeadLetter({ error, attempts: maxRetries, operationName, trackingId });
          } catch (dlqErr) {
            console.error(`[DLQ Handler Error] ${dlqErr.message}`);
          }
        }

        throw new Error(
          `${operationName} failed after ${maxRetries} attempts (Retry limit reached): ${error.message}`
        );
      }

      // Calculate exponential backoff delay with minor jitter: (base * 2^(attempt-1)) + jitter
      const jitter = Math.floor(Math.random() * 100);
      const delayMs = initialDelayMs * Math.pow(backoffFactor, attempt - 1) + jitter;

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt += 1;
    }
  }

  throw lastError;
};

module.exports = {
  withRetryProtection,
};
