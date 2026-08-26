const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const DocumentVersion = require('../models/DocumentVersion');
const DocumentVerification = require('../models/DocumentVerification');
const Student = require('../models/Student');
const Application = require('../models/Application');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { ROLES, DOCUMENT_TYPES, DOCUMENT_STATUS, DOCUMENT_VERSION_STATUS, LIFECYCLE_STAGES } = require('../config/constants');
const { uploadStudentDocument, getDocumentSignedUrl, LOCAL_STORAGE_DIR } = require('../services/s3Service');
const { queueDocumentProcessing } = require('../services/sqsService');
const { transitionStudentStage } = require('../services/stateMachineService');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mime = file.mimetype;
    if (allowed.test(ext) || allowed.test(mime)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, and PNG files are accepted'));
    }
  },
});

/**
 * @route   GET /api/documents
 * @desc    Get student documents with current versions and verification results
 */
router.get('/', protect, async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === ROLES.STUDENT) {
      query.student = req.student._id;
    } else {
      // Counselor/Admin: filter by studentId or trackingId if passed, else fetch all active uploaded documents
      if (req.query.studentId) {
        query.student = req.query.studentId;
      } else if (req.query.trackingId) {
        const s = await Student.findOne({ trackingId: req.query.trackingId });
        if (s) query.student = s._id;
      } else {
        // Fetch all documents with uploaded versions for verification desk
        query.currentVersion = { $ne: null };
      }
    }

    let docs = await Document.find(query)
      .populate('currentVersion')
      .populate('student', 'firstName lastName email trackingId')
      .populate({
        path: 'application',
        select: 'applicationId personalDetails academicDetails',
      })
      .sort({ updatedAt: -1 })
      .lean();

    // If student has no documents initialized, create the 4 standard required documents
    if (req.user.role === ROLES.STUDENT && docs.length === 0) {
      const defaultTypes = [
        DOCUMENT_TYPES.MARKSHEET_10TH,
        DOCUMENT_TYPES.MARKSHEET_12TH,
        DOCUMENT_TYPES.TRANSFER_CERTIFICATE,
        DOCUMENT_TYPES.IDENTITY_PROOF,
      ];

      for (const dt of defaultTypes) {
        await Document.create({
          student: req.student._id,
          trackingId: req.student.trackingId,
          application: req.student.currentApplication,
          documentType: dt,
          status: DOCUMENT_STATUS.NOT_UPLOADED,
          isRequired: true,
        });
      }

      docs = await Document.find({ student: req.student._id })
        .populate('currentVersion')
        .lean();
    }

    // Attach latest verification details to each document
    const docsWithVerification = await Promise.all(
      docs.map(async (doc) => {
        let verification = null;
        let viewUrl = null;

        if (doc.currentVersion) {
          verification = await DocumentVerification.findOne({
            documentVersion: doc.currentVersion._id,
          }).lean();

          viewUrl = await getDocumentSignedUrl({
            s3Key: doc.currentVersion.s3Key,
            s3Bucket: doc.currentVersion.s3Bucket,
          });
        }

        return {
          ...doc,
          verification,
          viewUrl,
        };
      })
    );

    return sendSuccess(res, docsWithVerification);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/documents/upload
 * @desc    Upload document to S3 and initiate OCR verification
 */
router.post('/upload', protect, authorize(ROLES.STUDENT), upload.single('file'), async (req, res, next) => {
  try {
    const student = req.student;
    const file = req.file;
    const { documentType } = req.body;

    if (!file) {
      return sendError(res, 'File is required', 400, 'VALIDATION_ERROR');
    }
    if (!documentType) {
      return sendError(res, 'documentType is required', 400, 'VALIDATION_ERROR');
    }

    // Find or create main Document record
    let document = await Document.findOne({
      student: student._id,
      documentType,
    });

    if (!document) {
      document = await Document.create({
        student: student._id,
        trackingId: student.trackingId,
        application: student.currentApplication,
        documentType,
        status: DOCUMENT_STATUS.UPLOADED,
        isRequired: true,
      });
    }

    // Determine version number
    const versionCount = await DocumentVersion.countDocuments({ document: document._id });
    const versionNumber = versionCount + 1;

    // Upload to S3 / Local
    const s3Result = await uploadStudentDocument({
      trackingId: student.trackingId,
      documentType,
      versionNumber,
      fileName: file.originalname,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    // Create DocumentVersion
    const docVersion = await DocumentVersion.create({
      document: document._id,
      student: student._id,
      trackingId: student.trackingId,
      versionNumber,
      s3Key: s3Result.s3Key,
      s3Bucket: s3Result.s3Bucket,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      status: DOCUMENT_VERSION_STATUS.CURRENT,
      uploadedBy: `${student.firstName} ${student.lastName}`,
    });

    // Update main Document
    document.currentVersion = docVersion._id;
    document.status = DOCUMENT_STATUS.PROCESSING;
    await document.save();

    // Trigger Asynchronous Textract OCR & Verification
    await queueDocumentProcessing({
      documentVersionId: docVersion._id,
      documentId: document._id,
      studentId: student._id,
      trackingId: student.trackingId,
      fileBuffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
    });

    // Check if all required docs uploaded to transition stage
    const allRequiredDocs = await Document.find({ student: student._id, isRequired: true });
    const hasUnuploaded = allRequiredDocs.some((d) => d.status === DOCUMENT_STATUS.NOT_UPLOADED);
    if (!hasUnuploaded) {
      await transitionStudentStage({
        studentId: student._id,
        targetStage: LIFECYCLE_STAGES.DOCUMENT_VERIFICATION,
        actorId: req.user._id,
        actorType: 'STUDENT',
        reason: 'All required documents uploaded and dispatched for verification',
      });
    }

    // Log Audit
    await logAudit({
      actorId: req.user._id,
      actorType: 'STUDENT',
      studentId: student._id,
      trackingId: student.trackingId,
      action: 'DOCUMENT_UPLOADED',
      metadata: {
        documentType,
        versionNumber,
        fileName: file.originalname,
        s3Key: s3Result.s3Key,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(
      res,
      {
        document,
        version: docVersion,
      },
      'Document uploaded successfully. OCR verification started.',
      201
    );
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/documents/:id/replace
 * @desc    Replace an existing document (Version 1 -> SUPERSEDED, Version 2 -> CURRENT)
 */
router.post('/:id/replace', protect, authorize(ROLES.STUDENT), upload.single('file'), async (req, res, next) => {
  try {
    const student = req.student;
    const file = req.file;
    const { replacementReason } = req.body;
    const documentId = req.params.id;

    if (!file) {
      return sendError(res, 'Replacement file is required', 400, 'VALIDATION_ERROR');
    }

    const document = await Document.findOne({ _id: documentId, student: student._id });
    if (!document) {
      return sendError(res, 'Document record not found', 404, 'NOT_FOUND');
    }

    // Mark previous versions as SUPERSEDED
    await DocumentVersion.updateMany(
      { document: document._id },
      { status: DOCUMENT_VERSION_STATUS.SUPERSEDED }
    );

    const versionCount = await DocumentVersion.countDocuments({ document: document._id });
    const versionNumber = versionCount + 1;

    // Upload new version
    const s3Result = await uploadStudentDocument({
      trackingId: student.trackingId,
      documentType: document.documentType,
      versionNumber,
      fileName: file.originalname,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    const newVersion = await DocumentVersion.create({
      document: document._id,
      student: student._id,
      trackingId: student.trackingId,
      versionNumber,
      s3Key: s3Result.s3Key,
      s3Bucket: s3Result.s3Bucket,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      status: DOCUMENT_VERSION_STATUS.CURRENT,
      replacementReason: replacementReason || 'Student uploaded corrected document',
      uploadedBy: `${student.firstName} ${student.lastName}`,
    });

    document.currentVersion = newVersion._id;
    document.status = DOCUMENT_STATUS.PROCESSING;
    await document.save();

    // Restart verification workflow
    await queueDocumentProcessing({
      documentVersionId: newVersion._id,
      documentId: document._id,
      studentId: student._id,
      trackingId: student.trackingId,
      fileBuffer: file.buffer,
      fileName: file.originalname,
    });

    await logAudit({
      actorId: req.user._id,
      actorType: 'STUDENT',
      studentId: student._id,
      trackingId: student.trackingId,
      action: 'DOCUMENT_REPLACED',
      metadata: {
        documentType: document.documentType,
        newVersionNumber: versionNumber,
        replacementReason,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    await createNotification({
      studentId: student._id,
      trackingId: student.trackingId,
      type: 'IN_APP',
      title: 'Document Replacement Under Verification',
      content: `Replacement for ${document.documentType} (v${versionNumber}) received. Verification restarted.`,
      recipient: student.email,
    });

    return sendSuccess(
      res,
      {
        document,
        newVersion,
      },
      `Document successfully replaced with v${versionNumber}. Previous version superseded.`
    );
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/documents/:id/versions
 * @desc    Get version history of a document
 */
router.get('/:id/versions', protect, async (req, res, next) => {
  try {
    const versions = await DocumentVersion.find({ document: req.params.id }).sort({ versionNumber: -1 });
    return sendSuccess(res, versions);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/documents/raw/:key
 * @desc    Local development file stream
 */
router.get('/raw/:key', async (req, res, next) => {
  try {
    const key = decodeURIComponent(req.params.key);
    const filePath = path.join(LOCAL_STORAGE_DIR, key.replace('students/', ''));
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
    return res.status(404).send('File not found');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
