const Notification = require('../models/Notification');
const { NOTIFICATION_STATUS } = require('../config/constants');
const { emitToStudent } = require('../config/socket');
const { sendSesEmail } = require('./sesService');
const { sendSnsSms } = require('./snsService');

const createNotification = async ({
  studentId,
  trackingId,
  type = 'IN_APP',
  title,
  content,
  recipient,
}) => {
  try {
    const notification = await Notification.create({
      student: studentId,
      trackingId,
      type,
      title,
      content,
      recipient: recipient || 'system',
      status: NOTIFICATION_STATUS.PENDING,
    });

    if (type === 'EMAIL' && recipient) {
      notification.status = NOTIFICATION_STATUS.SENDING;
      await notification.save();

      const sesResult = await sendSesEmail({
        to: recipient,
        subject: title,
        textBody: content,
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #1e3a8a;">${title}</h2>
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">${content}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
            <p style="font-size: 12px; color: #6b7280;">Student Tracking ID: <strong>${trackingId}</strong> | Autonomous Admissions Portal</p>
          </div>
        `,
      });

      if (sesResult.success) {
        notification.status = NOTIFICATION_STATUS.SENT;
        notification.sesMessageId = sesResult.messageId;
        notification.sentAt = new Date();
      } else {
        notification.status = NOTIFICATION_STATUS.FAILED;
        notification.failureReason = sesResult.error;
      }
      await notification.save();
    } else if (type === 'SMS' && recipient) {
      notification.status = NOTIFICATION_STATUS.SENDING;
      await notification.save();

      const smsResult = await sendSnsSms({
        phoneNumber: recipient,
        message: `${title}: ${content}`,
      });

      if (smsResult.success) {
        notification.status = NOTIFICATION_STATUS.SENT;
        notification.sesMessageId = smsResult.messageId;
        notification.sentAt = new Date();
      } else {
        notification.status = NOTIFICATION_STATUS.FAILED;
        notification.failureReason = smsResult.error;
      }
      await notification.save();
    } else {
      // In-app notifications are directly marked as SENT to user
      notification.status = NOTIFICATION_STATUS.SENT;
      notification.sentAt = new Date();
      await notification.save();
    }

    // Emit real-time notification to the student
    if (trackingId) {
      emitToStudent(trackingId, 'notification:new', {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        content: notification.content,
        createdAt: notification.createdAt,
      });
    }

    return notification;
  } catch (error) {
    console.error(`[Notification Error] ${error.message}`);
    return null;
  }
};

module.exports = {
  createNotification,
};
