const SystemError = require('../models/SystemError');

const logger = {
  info: (message, meta = {}) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, Object.keys(meta).length ? meta : '');
  },
  warn: (message, meta = {}) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, Object.keys(meta).length ? meta : '');
  },
  error: async (message, meta = {}) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, meta.stack || meta);
    try {
      if (meta.category) {
        await SystemError.create({
          category: meta.category,
          message,
          stack: meta.stack || '',
          endpoint: meta.endpoint || '',
          httpMethod: meta.httpMethod || '',
          studentTrackingId: meta.trackingId || null,
          metadata: meta,
        });
      }
    } catch (e) {
      // Don't throw inside logger
    }
  },
};

module.exports = logger;
