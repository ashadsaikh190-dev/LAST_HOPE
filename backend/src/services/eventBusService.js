const Student = require('../models/Student');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { NOTIFICATION_STATUS } = require('../config/constants');
const { emitToStudent, emitToCounselors, emitToAdmins, emitBroadcast } = require('../config/socket');
const { evaluateStudentRisk } = require('./riskService');

/**
 * Central Event Bus & Synchronization Engine for Full Three-Role Integration
 */
const EVENTS = {
  STUDENT_REGISTERED: 'STUDENT_REGISTERED',
  STUDENT_LOGIN: 'STUDENT_LOGIN',
  APPLICATION_STARTED: 'APPLICATION_STARTED',
  APPLICATION_UPDATED: 'APPLICATION_UPDATED',
  APPLICATION_COMPLETED: 'APPLICATION_COMPLETED',
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
  DOCUMENT_UPDATED: 'DOCUMENT_UPDATED',
  DOCUMENT_VERIFIED: 'DOCUMENT_VERIFIED',
  DOCUMENT_REJECTED: 'DOCUMENT_REJECTED',
  SCHOLARSHIP_SUBMITTED: 'SCHOLARSHIP_SUBMITTED',
  SCHOLARSHIP_APPROVED: 'SCHOLARSHIP_APPROVED',
  SCHOLARSHIP_REJECTED: 'SCHOLARSHIP_REJECTED',
  ADMISSION_FORM_SUBMITTED: 'ADMISSION_FORM_SUBMITTED',
  ADMISSION_FORM_APPROVED: 'ADMISSION_FORM_APPROVED',
  ADMISSION_FORM_REJECTED: 'ADMISSION_FORM_REJECTED',
  OFFER_GENERATED: 'OFFER_GENERATED',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  ADMISSION_COMPLETED: 'ADMISSION_COMPLETED',
  COUNSELLOR_ASSIGNED: 'COUNSELLOR_ASSIGNED',
  COUNSELLOR_REASSIGNED: 'COUNSELLOR_REASSIGNED',
  COUNSELLOR_FOLLOWUP_CREATED: 'COUNSELLOR_FOLLOWUP_CREATED',
  COUNSELLOR_FOLLOWUP_COMPLETED: 'COUNSELLOR_FOLLOWUP_COMPLETED',
  EMAIL_SENT: 'EMAIL_SENT',
  WHATSAPP_SENT: 'WHATSAPP_SENT',
  STUDENT_BECAME_AT_RISK: 'STUDENT_BECAME_AT_RISK',
  STUDENT_RECOVERED: 'STUDENT_RECOVERED',
};

/**
 * Dispatches an event across the entire system, synchronizing Database, Audit Trail,
 * Notifications, and Multi-Room Real-Time WebSockets
 */
const dispatchEvent = async (eventName, payload = {}) => {
  const {
    actorId = 'SYSTEM',
    actorType = 'SYSTEM',
    studentId = null,
    trackingId = null,
    metadata = {},
    notificationData = null,
    ipAddress = '',
    userAgent = '',
  } = payload;

  try {
    // 1. Update Student Timestamps & Reevaluate Risk Status
    let student = null;
    if (studentId || trackingId) {
      student = studentId
        ? await Student.findById(studentId)
        : await Student.findOne({ trackingId });

      if (student) {
        if (actorType === 'STUDENT') {
          student.lastActivityAt = new Date();
          await student.save();
        } else if (actorType === 'COUNSELOR' || actorType === 'ADMIN') {
          student.lastCounselorInteractionAt = new Date();
          await student.save();
        }

        // Reevaluate at-risk state
        const risk = await evaluateStudentRisk(student);
        if (risk.isAtRisk) {
          emitToCounselors('student:at_risk', {
            trackingId: student.trackingId,
            studentName: `${student.firstName} ${student.lastName}`,
            riskType: risk.riskType,
            riskReason: risk.riskReason,
          });
          emitToAdmins('student:at_risk', {
            trackingId: student.trackingId,
            riskType: risk.riskType,
          });
        } else {
          emitToCounselors('student:recovered', {
            trackingId: student.trackingId,
            studentName: `${student.firstName} ${student.lastName}`,
          });
        }
      }
    }

    // 2. Record Structured Immutable Audit Log
    await AuditLog.create({
      actorId: String(actorId),
      actorType,
      student: student?._id || studentId || null,
      trackingId: student?.trackingId || trackingId || null,
      action: eventName,
      result: 'SUCCESS',
      metadata,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });

    // 3. Create In-App/Email Notification if provided (with Deduplication)
    if (notificationData && notificationData.recipient) {
      const recentDup = await Notification.findOne({
        recipient: notificationData.recipient,
        title: notificationData.title,
        createdAt: { $gte: new Date(Date.now() - 30 * 1000) }, // 30s dedup window
      });

      if (!recentDup) {
        const notif = await Notification.create({
          student: student?._id || studentId || null,
          trackingId: student?.trackingId || trackingId || null,
          type: notificationData.type || 'IN_APP',
          title: notificationData.title,
          content: notificationData.content,
          recipient: notificationData.recipient,
          status: NOTIFICATION_STATUS.SENT,
          sentAt: new Date(),
        });

        if (student?.trackingId) {
          emitToStudent(student.trackingId, 'notification:new', {
            id: notif._id,
            type: notif.type,
            title: notif.title,
            content: notif.content,
            createdAt: notif.createdAt,
          });
        }
      }
    }

    // 4. Real-Time Multi-Room Socket Broadcasting
    const eventPayload = {
      event: eventName,
      trackingId: student?.trackingId || trackingId,
      studentId: student?._id || studentId,
      actorType,
      metadata,
      timestamp: new Date(),
    };

    if (student?.trackingId) {
      emitToStudent(student.trackingId, `event:${eventName.toLowerCase()}`, eventPayload);
      emitToStudent(student.trackingId, 'sync:update', eventPayload);
    }

    emitToCounselors(`event:${eventName.toLowerCase()}`, eventPayload);
    emitToCounselors('sync:update', eventPayload);

    emitToAdmins(`event:${eventName.toLowerCase()}`, eventPayload);
    emitToAdmins('sync:update', eventPayload);

    return { success: true, event: eventName };
  } catch (error) {
    console.error(`[EventBus Error] Failed to dispatch event ${eventName}: ${error.message}`);
    return { success: false, event: eventName, error: error.message };
  }
};

module.exports = {
  EVENTS,
  dispatchEvent,
};
