const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');
const { s3Client, isAwsConfigured } = require('../config/aws');
const config = require('../config/env');
const { incrementUsageCounter } = require('./costProtectionService');
const { withRetryProtection } = require('../utils/retryHelper');

const LOCAL_STORAGE_DIR = path.resolve(__dirname, '../../uploads');

// Ensure local fallback storage directory exists
if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
  fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
}

/**
 * Uploads document buffer to Amazon S3 (or local storage fallback)
 */
const uploadStudentDocument = async ({
  trackingId,
  documentType,
  versionNumber = 1,
  fileName,
  buffer,
  mimeType,
}) => {
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const s3Key = `students/${trackingId}/${documentType}/v${versionNumber}_${sanitizedFileName}`;

  if (isAwsConfigured && config.AWS_S3_BUCKET) {
    try {
      await withRetryProtection({
        operationName: 'AWS_S3_PUT_OBJECT',
        maxRetries: 3,
        trackingId,
        fn: async (attempt) => {
          const command = new PutObjectCommand({
            Bucket: config.AWS_S3_BUCKET,
            Key: s3Key,
            Body: buffer,
            ContentType: mimeType,
            Metadata: {
              trackingId,
              documentType,
              version: String(versionNumber),
            },
          });
          return await s3Client.send(command);
        },
      });

      await incrementUsageCounter('totalAwsOperations');
      console.log(`[Amazon S3] Document uploaded successfully: ${s3Key}`);

      return {
        s3Key,
        s3Bucket: config.AWS_S3_BUCKET,
        storageProvider: 'AMAZON_S3',
      };
    } catch (error) {
      console.error(`[Amazon S3 Error] Upload failed: ${error.message}`);
      throw new Error(`S3 Document Upload Failed: ${error.message}`);
    }
  }

  // Local Storage Fallback
  const localStudentDir = path.join(LOCAL_STORAGE_DIR, trackingId, documentType);
  if (!fs.existsSync(localStudentDir)) {
    fs.mkdirSync(localStudentDir, { recursive: true });
  }

  const localFilePath = path.join(localStudentDir, `v${versionNumber}_${sanitizedFileName}`);
  fs.writeFileSync(localFilePath, buffer);
  console.log(`[Local S3 Fallback] Saved document to local disk: ${localFilePath}`);

  return {
    s3Key,
    s3Bucket: 'local-mock-bucket',
    storageProvider: 'LOCAL_DISK',
  };
};

/**
 * Generates a secure, temporary pre-signed URL to view the private document
 */
const getDocumentSignedUrl = async ({ s3Key, s3Bucket, expiresInSeconds = 3600 }) => {
  if (isAwsConfigured && s3Bucket && s3Bucket !== 'local-mock-bucket') {
    try {
      const command = new GetObjectCommand({
        Bucket: s3Bucket || config.AWS_S3_BUCKET,
        Key: s3Key,
      });
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
      return signedUrl;
    } catch (err) {
      console.error(`[Amazon S3 Presigner Error] ${err.message}`);
    }
  }

  // Local dev URL
  return `/api/documents/raw/${encodeURIComponent(s3Key)}`;
};

module.exports = {
  uploadStudentDocument,
  getDocumentSignedUrl,
  LOCAL_STORAGE_DIR,
};
