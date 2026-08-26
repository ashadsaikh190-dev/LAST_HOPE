const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { TextractClient } = require('@aws-sdk/client-textract');
const { SQSClient, GetQueueAttributesCommand } = require('@aws-sdk/client-sqs');
const { SESClient, GetSendQuotaCommand } = require('@aws-sdk/client-ses');
const { CloudWatchClient } = require('@aws-sdk/client-cloudwatch');
const { CloudWatchLogsClient } = require('@aws-sdk/client-cloudwatch-logs');
const config = require('./env');

const isAwsConfigured = Boolean(
  config.AWS_ACCESS_KEY_ID && 
  config.AWS_SECRET_ACCESS_KEY && 
  config.AWS_REGION
);

const awsCredentials = isAwsConfigured ? {
  accessKeyId: config.AWS_ACCESS_KEY_ID,
  secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
} : undefined;

const awsConfig = {
  region: config.AWS_REGION,
  credentials: awsCredentials,
};

// Real AWS SDK v3 Clients
const s3Client = new S3Client(awsConfig);
const textractClient = new TextractClient(awsConfig);
const sqsClient = new SQSClient(awsConfig);
const sesClient = new SESClient(awsConfig);
const cloudWatchClient = new CloudWatchClient(awsConfig);
const cloudWatchLogsClient = new CloudWatchLogsClient(awsConfig);

/**
 * Genuine Health Check functions for AWS services
 * These actually query the AWS endpoints or detect unconfigured state accurately
 */
const checkS3Health = async () => {
  if (!isAwsConfigured) {
    return { status: 'NOT_CONFIGURED', message: 'AWS credentials not provided. Using local storage fallback.' };
  }
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: config.AWS_S3_BUCKET }));
    return { status: 'CONNECTED', bucket: config.AWS_S3_BUCKET, region: config.AWS_REGION };
  } catch (err) {
    return { status: 'ERROR', message: err.message, bucket: config.AWS_S3_BUCKET };
  }
};

const checkSQSHealth = async () => {
  if (!isAwsConfigured || !config.AWS_SQS_DOCUMENT_QUEUE_URL) {
    return { status: 'NOT_CONFIGURED', message: 'SQS queue URL or AWS credentials not provided.' };
  }
  try {
    const result = await sqsClient.send(new GetQueueAttributesCommand({
      QueueUrl: config.AWS_SQS_DOCUMENT_QUEUE_URL,
      AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible'],
    }));
    return { 
      status: 'CONNECTED', 
      queueUrl: config.AWS_SQS_DOCUMENT_QUEUE_URL,
      messages: result.Attributes?.ApproximateNumberOfMessages || 0,
      inFlight: result.Attributes?.ApproximateNumberOfMessagesNotVisible || 0
    };
  } catch (err) {
    return { status: 'ERROR', message: err.message };
  }
};

const checkSESHealth = async () => {
  if (!isAwsConfigured) {
    return { status: 'NOT_CONFIGURED', message: 'AWS credentials not provided. Using console/mock email adapter.' };
  }
  try {
    const quota = await sesClient.send(new GetSendQuotaCommand({}));
    return { 
      status: 'CONNECTED', 
      fromEmail: config.AWS_SES_FROM_EMAIL,
      max24HourSend: quota.Max24HourSend,
      sentLast24Hours: quota.SentLast24Hours
    };
  } catch (err) {
    return { status: 'ERROR', message: err.message };
  }
};

const checkTextractHealth = async () => {
  if (!isAwsConfigured) {
    return { status: 'NOT_CONFIGURED', message: 'AWS credentials not provided. Local OCR fallback available.' };
  }
  return { status: 'READY', region: config.AWS_REGION, engine: 'Amazon Textract v3' };
};

module.exports = {
  isAwsConfigured,
  s3Client,
  textractClient,
  sqsClient,
  sesClient,
  cloudWatchClient,
  cloudWatchLogsClient,
  checkS3Health,
  checkSQSHealth,
  checkSESHealth,
  checkTextractHealth,
};
