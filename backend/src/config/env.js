const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  
  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/autonomous_admissions',

  // Authentication
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_key_autonomous_admissions_platform_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // AWS Configuration
  AWS_REGION: process.env.AWS_REGION || 'ap-south-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || 'admissions-student-documents-prod',
  AWS_SES_FROM_EMAIL: process.env.AWS_SES_FROM_EMAIL || 'admissions@university.edu',
  AWS_SQS_DOCUMENT_QUEUE_URL: process.env.AWS_SQS_DOCUMENT_QUEUE_URL || '',
  AWS_SQS_NOTIFICATION_QUEUE_URL: process.env.AWS_SQS_NOTIFICATION_QUEUE_URL || '',
  AWS_EC2_INSTANCE_ID: process.env.AWS_EC2_INSTANCE_ID || '',

  // AWS Cost Protection & Emergency Shutdown Thresholds (USD)
  AWS_CREDIT_LIMIT: parseFloat(process.env.AWS_CREDIT_LIMIT || process.env.AWS_BUDGET_LIMIT) || 96.87,
  AWS_BUDGET_LIMIT: parseFloat(process.env.AWS_CREDIT_LIMIT || process.env.AWS_BUDGET_LIMIT) || 96.87,
  AWS_TARGET_LIMIT: parseFloat(process.env.AWS_TARGET_LIMIT) || 50.0,
  AWS_WARNING_THRESHOLD: parseFloat(process.env.AWS_WARNING_THRESHOLD) || 30.0,
  AWS_CRITICAL_THRESHOLD: parseFloat(process.env.AWS_CRITICAL_THRESHOLD) || 40.0,
  AWS_EMERGENCY_THRESHOLD: parseFloat(process.env.AWS_EMERGENCY_THRESHOLD) || 50.0,
  AWS_HARD_PROTECTION_THRESHOLD: parseFloat(process.env.AWS_HARD_PROTECTION_THRESHOLD) || 60.0,
  
  // Cost Simulation & Testing Mode
  AWS_COST_PROTECTION_TEST_MODE: process.env.AWS_COST_PROTECTION_TEST_MODE === 'true' || true,
  AWS_SIMULATED_COST: parseFloat(process.env.AWS_SIMULATED_COST) || 0,
  AWS_COST_CHECK_INTERVAL_MS: parseInt(process.env.AWS_COST_CHECK_INTERVAL_MS, 10) || 60000,

  // Application Usage Limits (Defense Layer 2)
  MAX_TEXTRACT_DOCUMENTS: parseInt(process.env.MAX_TEXTRACT_DOCUMENTS, 10) || 50,
  MAX_EMAILS: parseInt(process.env.MAX_EMAILS, 10) || 200,
  MAX_AWS_OPERATIONS: parseInt(process.env.MAX_AWS_OPERATIONS, 10) || 1000,
  MAX_SQS_MESSAGES: parseInt(process.env.MAX_SQS_MESSAGES, 10) || 500,
  MAX_LAMBDA_OPERATIONS: parseInt(process.env.MAX_LAMBDA_OPERATIONS, 10) || 500,
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES, 10) || 3,
  
  // AI & External APIs
  AI_SECRET_KEY: process.env.AI_SECRET_KEY || 'ai_internal_token_secret_key_2026',
  LLM_API_KEY: process.env.LLM_API_KEY || '',
  
  // WhatsApp Integration
  META_WHATSAPP_TOKEN: process.env.META_WHATSAPP_TOKEN || '',
  META_WHATSAPP_PHONE_NUMBER_ID: process.env.META_WHATSAPP_PHONE_NUMBER_ID || '',
  META_WEBHOOK_VERIFY_TOKEN: process.env.META_WEBHOOK_VERIFY_TOKEN || 'verify_admissions_token',
};

module.exports = config;
