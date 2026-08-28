const express = require('express');
const router = express.Router();
const axios = require('axios');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Student = require('../models/Student');
const StudentPersona = require('../models/StudentPersona');
const CounselorCase = require('../models/CounselorCase');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { ROLES, COUNSELOR_CASE_PRIORITY, COUNSELOR_CASE_CATEGORY } = require('../config/constants');
const { executeAiTool } = require('../services/aiToolService');
const { updateStudentPersona } = require('../services/personaService');
const { generateCaseId } = require('../utils/idGenerator');
const { emitToStudent, emitToCounselors } = require('../config/socket');
const config = require('../config/env');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * @route   POST /api/ai/chat
 * @desc    Multi-turn real-time AI conversation with secure tool calling & persona updates
 */
router.post('/chat', protect, authorize(ROLES.STUDENT), async (req, res, next) => {
  try {
    const student = req.student;
    const { message: userText, conversationId } = req.body;

    if (!userText || !userText.trim()) {
      return sendError(res, 'Message text is required', 400, 'VALIDATION_ERROR');
    }

    // Find or create active conversation
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
    }
    if (!conversation) {
      conversation = await Conversation.findOne({
        student: student._id,
        status: 'ACTIVE',
      });
    }
    if (!conversation) {
      conversation = await Conversation.create({
        student: student._id,
        trackingId: student.trackingId,
        channel: 'WEB_CHAT',
        status: 'ACTIVE',
      });
    }

    // Save Student message
    const studentMsg = await Message.create({
      conversation: conversation._id,
      student: student._id,
      trackingId: student.trackingId,
      sender: 'STUDENT',
      content: userText.trim(),
    });

    // Retrieve previous conversation history for multi-turn context
    const previousMessages = await Message.find({ conversation: conversation._id })
      .sort({ createdAt: 1 })
      .limit(10);
    const historyPayload = previousMessages.map((m) => ({
      role: m.sender === 'STUDENT' ? 'user' : 'assistant',
      content: m.content,
    }));

    // Call Python FastAPI AI Agent service
    let aiResponseData = null;
    try {
      const pyResponse = await axios.post(
        `${config.AI_SERVICE_URL}/ai/chat`,
        {
          trackingId: student.trackingId,
          studentId: String(student._id),
          message: userText,
          conversationId: String(conversation._id),
          history: historyPayload,
        },
        {
          headers: { 'X-AI-Secret-Key': config.AI_SECRET_KEY },
          timeout: 30000,
        }
      );
      aiResponseData = pyResponse.data;
    } catch (pyErr) {
      console.warn(`[AI Agent Service] Python service unreachable (${pyErr.message}). Using integrated assistant engine.`);
    }

    // If Python service is offline/dev fallback, use built-in autonomous intelligence engine
    if (!aiResponseData) {
      const lower = userText.toLowerCase();
      let replyContent = '';
      let detectedIntent = 'GENERAL_INQUIRY';
      let toolCallsExecuted = [];

      if (lower.includes('cse fee') || lower.includes('tuition fee') || lower.includes('cost')) {
        detectedIntent = 'FEE_INQUIRY';
        const progTool = await executeAiTool({
          toolName: 'getPrograms',
          studentId: student._id,
          trackingId: student.trackingId,
        });
        toolCallsExecuted.push({ toolName: 'getPrograms', result: progTool.data, status: 'SUCCESS' });
        const cse = (progTool.data || []).find((p) => p.code === 'CSE' || p.department === 'Computer Science');
        if (cse) {
          replyContent = `The annual tuition fee for **${cse.name} (${cse.code})** is **₹${cse.tuitionFee?.toLocaleString('en-IN')}** per year, with a registration fee of ₹${cse.applicationFee?.toLocaleString('en-IN')}. The program duration is ${cse.durationYears} years.`;
        } else {
          replyContent = `Tuition fees range from ₹75,000 to ₹1,20,000 depending on the engineering department. Would you like me to check a specific program?`;
        }
      } else if (lower.includes('document') || lower.includes('verified') || lower.includes('status')) {
        detectedIntent = 'DOCUMENT_STATUS_QUERY';
        const docTool = await executeAiTool({
          toolName: 'getVerificationStatus',
          studentId: student._id,
          trackingId: student.trackingId,
        });
        toolCallsExecuted.push({ toolName: 'getVerificationStatus', result: docTool.data, status: 'SUCCESS' });
        const verifs = docTool.data || [];
        if (verifs.length === 0) {
          replyContent = `You have not submitted documents yet. Please navigate to the **Documents** tab and upload your 10th marksheet, 12th marksheet, and identity proof.`;
        } else {
          const verifiedCount = verifs.filter((v) => v.status === 'VERIFIED').length;
          replyContent = `Here is your live verification status: **${verifiedCount}/${verifs.length}** documents verified. ${verifs.map((v) => `\n- **${v.documentType}**: ${v.status}`).join('')}`;
        }
      } else if (lower.includes('fee waiver') || lower.includes('financial aid') || lower.includes('cannot afford') || lower.includes('discount')) {
        detectedIntent = 'FEE_WAIVER_REQUEST';
        const escTool = await executeAiTool({
          toolName: 'createCounselorEscalation',
          studentId: student._id,
          trackingId: student.trackingId,
          parameters: {
            category: COUNSELOR_CASE_CATEGORY.FEE_WAIVER,
            priority: COUNSELOR_CASE_PRIORITY.HIGH,
            summary: `Special Fee Waiver / Financial Aid requested by ${student.firstName} ${student.lastName}`,
            reason: `Student asked: "${userText}"`,
            recommendedAction: 'Assess student family income proof against institutional scholarship matrix.',
          },
        });
        toolCallsExecuted.push({ toolName: 'createCounselorEscalation', result: escTool.data, status: 'SUCCESS' });
        replyContent = `I understand your financial inquiry. Because fee waivers require institutional policy evaluation, I have opened a high-priority counselor review ticket (**${escTool.data.caseId}**). An admissions counselor will review your academic record for institutional scholarship eligibility.`;
      } else if (lower.includes('enrollment') || lower.includes('enrollment number')) {
        detectedIntent = 'ENROLLMENT_QUERY';
        const enrollTool = await executeAiTool({
          toolName: 'getEnrollmentNumber',
          studentId: student._id,
          trackingId: student.trackingId,
        });
        toolCallsExecuted.push({ toolName: 'getEnrollmentNumber', result: enrollTool.data, status: 'SUCCESS' });
        if (enrollTool.data.isEnrolled) {
          replyContent = `Your official university enrollment number is **${enrollTool.data.enrollmentNumber}**! You are fully enrolled.`;
        } else {
          replyContent = `Your current stage is **${student.currentStage}**. Official Enrollment Numbers are generated automatically once your application, document verification, eligibility check, and admission offer are finalized.`;
        }
      } else if (lower.includes('university name') || lower.includes('what university') || lower.includes('giet') || lower.includes('about university') || lower.includes('location')) {
        detectedIntent = 'UNIVERSITY_KNOWLEDGE';
        const uniTool = await executeAiTool({
          toolName: 'getUniversityInfo',
          studentId: student._id,
          trackingId: student.trackingId,
        });
        toolCallsExecuted.push({ toolName: 'getUniversityInfo', result: uniTool.data, status: 'SUCCESS' });
        const u = uniTool.data || {};
        replyContent = `🏛️ **${u.name || 'GIET University (Gandhi Institute of Engineering and Technology)'}**\n\n• **Location**: Gunupur, Rayagada, Odisha (120-acre lush green campus)\n• **Rankings & Accreditations**: NAAC A++ (CGPA 3.78/4.0), NIRF Top 35 Engineering, NBA Tier-1 Accredited\n• **Placements**: 96.4% placement rate, Highest ₹54.2 LPA, Average ₹11.8 LPA\n• **Admissions Helpline**: +91 6857 250172 | admissions@giet.edu`;
      } else {
        replyContent = `Hello ${student.firstName}! I am your Autonomous Admissions Counselor for GIET University. I can help you with degree programs, cutoffs, tuition fees, document verification, or connect you with a senior advisor. What would you like to explore?`;
      }

      aiResponseData = {
        reply: replyContent,
        intent: detectedIntent,
        confidenceScore: 0.95,
        toolCalls: toolCallsExecuted,
      };
    }

    // Save AI message to database
    const aiMsg = await Message.create({
      conversation: conversation._id,
      student: student._id,
      trackingId: student.trackingId,
      sender: 'AI',
      content: aiResponseData.reply,
      intent: aiResponseData.intent || 'GENERAL_QUERY',
      confidenceScore: aiResponseData.confidenceScore || 0.95,
      toolCalls: aiResponseData.toolCalls || [],
    });

    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Update Student Persona dynamically
    await updateStudentPersona(student._id, {
      majorConcern: aiResponseData.intent === 'FEE_WAIVER_REQUEST' ? 'FINANCIAL_AID' : undefined,
      feeConcern: aiResponseData.intent === 'FEE_WAIVER_REQUEST' ? 'HIGH_CONCERN' : undefined,
    });

    // Real-time broadcast
    emitToStudent(student.trackingId, 'chat:message', {
      conversationId: conversation._id,
      message: aiMsg,
    });

    return sendSuccess(res, {
      conversationId: conversation._id,
      userMessage: studentMsg,
      aiMessage: aiMsg,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/ai/conversations
 * @desc    Get current conversation message history
 */
router.get('/conversations', protect, async (req, res, next) => {
  try {
    let studentId;
    if (req.user.role === ROLES.STUDENT) {
      studentId = req.student._id;
    } else {
      studentId = req.query.studentId;
    }

    if (!studentId) {
      return sendError(res, 'studentId is required', 400, 'VALIDATION_ERROR');
    }

    const conversation = await Conversation.findOne({ student: studentId }).sort({ updatedAt: -1 });
    if (!conversation) {
      return sendSuccess(res, { messages: [] });
    }

    const messages = await Message.find({ conversation: conversation._id }).sort({ createdAt: 1 });
    return sendSuccess(res, { conversation, messages });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/ai/tool-execute
 * @desc    Authorized proxy for executing backend tools on behalf of AI Agent
 */
router.post('/tool-execute', async (req, res, next) => {
  try {
    const authHeader = req.headers['x-ai-secret-key'];
    if (authHeader !== config.AI_SECRET_KEY) {
      return sendError(res, 'Unauthorized AI tool caller', 403, 'AUTHORIZATION_ERROR');
    }

    const { toolName, parameters, studentId, trackingId } = req.body;
    const result = await executeAiTool({
      toolName,
      parameters,
      studentId,
      trackingId,
    });

    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/ai/public-chat
 * @desc    Public admissions AI assistant endpoint for prospective students & visitors
 */
router.post('/public-chat', async (req, res, next) => {
  try {
    const { message: userText, trackingId, history } = req.body;
    if (!userText || !userText.trim()) {
      return sendError(res, 'Message text is required', 400, 'VALIDATION_ERROR');
    }

    const tid = trackingId || 'PROSPECT-VISITOR';

    let aiResponseData = null;
    try {
      const pyResponse = await axios.post(
        `${config.AI_SERVICE_URL}/ai/chat`,
        {
          trackingId: tid,
          studentId: '',
          message: userText.trim(),
          history: history || [],
        },
        {
          headers: { 'X-AI-Secret-Key': config.AI_SECRET_KEY },
          timeout: 30000,
        }
      );
      aiResponseData = pyResponse.data;
    } catch (pyErr) {
      console.warn(`[AI Agent Public Chat] Python service error: ${pyErr.message}`);
    }

    if (!aiResponseData) {
      aiResponseData = {
        reply: "Hello! 👋 I am the University AI Assistant. I can assist you with degree programs (CSE, AI & DS, ECE, MBA), fees, eligibility cutoffs, campus facilities, and general academic inquiries. How can I help you today?",
        intent: "GENERAL_QUERY",
        confidenceScore: 0.90,
        toolCalls: [],
        escalated: false,
      };
    }

    return sendSuccess(res, {
      aiMessage: {
        _id: `public-ai-${Date.now()}`,
        sender: 'AI',
        content: aiResponseData.reply,
        intent: aiResponseData.intent || 'GENERAL_QUERY',
        confidenceScore: aiResponseData.confidenceScore || 0.90,
        toolCalls: aiResponseData.toolCalls || [],
        escalated: aiResponseData.escalated || false,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
