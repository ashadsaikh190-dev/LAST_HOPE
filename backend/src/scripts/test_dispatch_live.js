const mongoose = require('mongoose');
const { SendEmailCommand } = require('@aws-sdk/client-ses');
const { PublishCommand } = require('@aws-sdk/client-sns');
const { sesClient, isAwsConfigured } = require('../config/aws');
const { SNSClient } = require('@aws-sdk/client-sns');
const config = require('../config/env');

async function checkAndSend() {
  console.log('====================================================');
  console.log('🔍 AWS LIVE DISPATCH TEST REPORT');
  console.log('====================================================');

  await mongoose.connect(config.MONGODB_URI);

  // 1. Direct SES Send attempt
  console.log('\n--- 1. DIRECT AMAZON SES ATTEMPT TO ashadsaikh7@gmail.com ---');
  try {
    const cmd = new SendEmailCommand({
      Source: config.AWS_SES_FROM_EMAIL || 'admissions@university.edu',
      Destination: {
        ToAddresses: ['ashadsaikh7@gmail.com'],
      },
      Message: {
        Subject: { Data: 'GIET University - Official Admission Confirmation', Charset: 'UTF-8' },
        Body: {
          Text: { Data: 'Dear Saikh Ashad,\n\nYour university admissions profile is active! Student Tracking ID: STU-2026-67A9. Portal: http://172.33.0.36:5173', Charset: 'UTF-8' },
        },
      },
    });

    const res = await sesClient.send(cmd);
    console.log('✅ SES EMAIL SENT SUCCESSFULLY! MessageId:', res.MessageId);
  } catch (err) {
    console.log('❌ SES Status:', err.name, ':', err.message);
  }

  // 2. Direct SNS Send attempt
  console.log('\n--- 2. DIRECT AMAZON SNS SMS ATTEMPT TO +919556562197 ---');
  const snsUsEast = new SNSClient({
    region: 'us-east-1',
    credentials: {
      accessKeyId: config.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    const res = await snsUsEast.send(
      new PublishCommand({
        PhoneNumber: '+919556562197',
        Message: 'GIET University Admissions: Hello Saikh Ashad! Your test alert is active. Portal: http://172.33.0.36:5173',
      })
    );
    console.log('✅ SNS SMS PUBLISHED TO AWS GATEWAY! MessageId:', res.MessageId);
  } catch (err) {
    console.log('❌ SNS Status:', err.name, ':', err.message);
  }

  console.log('====================================================');
  process.exit(0);
}

checkAndSend();
