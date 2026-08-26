const IdempotencyKey = require('../models/IdempotencyKey');

/**
 * Executes a critical operation (Textract, SES, SQS dispatch, webhook, etc.) with idempotency protection.
 * If the operation key has already been completed, returns the cached result without repeating the AWS call.
 *
 * @param {Object} options
 * @param {string} options.key - Unique key (e.g. `textract:doc-version:123`, `email:welcome:student@test.edu`)
 * @param {string} options.action - Action category name
 * @param {Function} options.executeFn - Asynchronous function to execute if key is new
 * @param {number} [options.ttlSeconds=86400] - Time to live in seconds (default 24h)
 * @returns {Promise<{ isDuplicate: boolean, result: any }>}
 */
const executeWithIdempotency = async ({
  key,
  action,
  executeFn,
  ttlSeconds = 86400,
}) => {
  if (!key) {
    const result = await executeFn();
    return { isDuplicate: false, result };
  }

  // Check if idempotency record exists
  let record = await IdempotencyKey.findOne({ key });

  if (record && record.status === 'COMPLETED') {
    console.log(`[Idempotency Guard] Duplicate operation prevented for key: ${key}. Returning existing result.`);
    return {
      isDuplicate: true,
      result: record.result,
    };
  }

  if (record && record.status === 'IN_PROGRESS') {
    console.warn(`[Idempotency Guard] Operation ${key} is already in-progress. Preventing concurrent duplicate execution.`);
    return {
      isDuplicate: true,
      inProgress: true,
      result: record.result,
    };
  }

  // Create or update record as IN_PROGRESS
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  record = await IdempotencyKey.findOneAndUpdate(
    { key },
    {
      key,
      action,
      status: 'IN_PROGRESS',
      expiresAt,
      $inc: { attempts: 1 },
    },
    { upsert: true, new: true }
  );

  try {
    const result = await executeFn();

    record.status = 'COMPLETED';
    record.result = result;
    record.error = null;
    await record.save();

    return {
      isDuplicate: false,
      result,
    };
  } catch (error) {
    record.status = 'FAILED';
    record.error = error.message;
    await record.save();
    throw error;
  }
};

module.exports = {
  executeWithIdempotency,
};
