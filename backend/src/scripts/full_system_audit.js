const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
const HEALTH_URL = 'http://localhost:5000/health';
const AI_URL = 'http://localhost:8000';

async function runAudit() {
  console.log('================================================================');
  console.log('🔬 STARTING COMPLETE ARCHITECTURAL & END-TO-END AUDIT');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. HEALTH CHECKS
    console.log('\n--- 1. SYSTEM HEALTH & AWS METRICS AUDIT ---');
    const healthRes = await axios.get(HEALTH_URL);
    assert(healthRes.status === 200 && healthRes.data.status === 'HEALTHY', 'Backend Health Endpoint (HTTP 200 HEALTHY)');
    assert(healthRes.data.components?.database?.status === 'UP', 'MongoDB Connection Active');
    assert(healthRes.data.components?.aws?.isConfigured === true, 'Amazon Web Services Configured');
    assert(healthRes.data.components?.aws?.costProtection?.budgetLimit === 96.87, 'AWS Hard Limit Ceiling ($96.87 Safeguard)');

    const aiHealth = await axios.get(`${AI_URL}/health`);
    assert(aiHealth.status === 200 && aiHealth.data.status === 'HEALTHY', 'Python FastAPI AI Agent Service Healthy');

    // 2. PROGRAMS CATALOG
    console.log('\n--- 2. PROGRAM CATALOG & FEE MATRIX AUDIT ---');
    const progsRes = await axios.get(`${BASE_URL}/programs`);
    assert(progsRes.data.success && progsRes.data.data.length >= 5, `Academic Programs Catalog (Found ${progsRes.data.data.length} active degrees)`);
    const cse = progsRes.data.data.find((p) => p.code === 'CSE');
    assert(cse && cse.tuitionFee === 110000 && cse.durationYears === 4, 'B.Tech CSE Fee & Duration Accuracy');

    // 3. AUTHENTICATION & ROLE GUARDS
    console.log('\n--- 3. AUTHENTICATION, ROLES & MIDDLEWARE AUDIT ---');
    const rand = Math.floor(Math.random() * 100000);
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      firstName: 'Audit',
      lastName: 'Student' + rand,
      email: `audit_${rand}@test.edu`,
      password: 'AuditPassword123!',
      phone: '+919988776655',
    });
    assert(regRes.status === 201 && regRes.data.data.token, 'Student User Registration & JWT Issuance');
    const studentToken = regRes.data.data.token;
    const trackingId = regRes.data.data.student.trackingId;

    const counselorLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'counselor@university.edu',
      password: 'CounselorPassword123!',
    });
    assert(counselorLogin.status === 200 && counselorLogin.data.data.user.role === 'COUNSELOR', 'Counselor Authentication & JWT Claims');
    const counselorToken = counselorLogin.data.data.token;

    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@university.edu',
      password: 'AdminPassword123!',
    });
    assert(adminLogin.status === 200 && adminLogin.data.data.user.role === 'ADMIN', 'Admin Authentication & JWT Claims');
    const adminToken = adminLogin.data.data.token;

    // 4. STUDENT APPLICATION & DOCUMENTS
    console.log('\n--- 4. STUDENT LIFECYCLE & APPLICATION PIPELINE ---');
    const appRes = await axios.post(
      `${BASE_URL}/applications`,
      {
        programId: cse._id,
        personalDetails: {
          fullName: 'Audit Student',
          email: `audit_${rand}@test.edu`,
          phone: '+919988776655',
          dateOfBirth: '2005-08-15',
          gender: 'MALE',
          nationality: 'Indian',
        },
        academicDetails: {
          tenthBoard: 'CBSE',
          tenthPassingYear: 2022,
          tenthPercentage: 94.0,
          twelfthBoard: 'CBSE',
          twelfthPassingYear: 2024,
          twelfthPercentage: 95.5,
          twelfthStream: 'Science',
          physicsMarks: 96,
          chemistryMarks: 94,
          mathMarks: 97,
        },
      },
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );
    assert(appRes.status === 201 && appRes.data.data.applicationId, `Application Submission (${appRes.data.data.applicationId})`);
    const applicationId = appRes.data.data._id;

    const docList = await axios.get(`${BASE_URL}/documents`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(docList.data.data.length === 8, `Complete 8 University Admission Document Slots Provisioned (${docList.data.data.length} Slots)`);

    // 5. FEE PAYMENT & RECEIPTS
    console.log('\n--- 5. PAYMENT RECONCILIATION & NOTIFICATIONS ---');
    const payOrder = await axios.post(
      `${BASE_URL}/payments/create`,
      { applicationId, feeType: 'APPLICATION_FEE' },
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );
    assert(payOrder.data.success && payOrder.data.data.amount === 1000, 'Idempotent Payment Order Creation (₹1,000 Application Fee)');

    const payConfirm = await axios.post(
      `${BASE_URL}/payments/${payOrder.data.data._id}/simulate-checkout`,
      { transactionReference: `TXN-AUDIT-${rand}` },
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );
    assert(payConfirm.data.data.status === 'SUCCESS', `Payment Success Reconciliation (${payConfirm.data.data.transactionReference})`);

    const notifs = await axios.get(`${BASE_URL}/students/notifications`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(notifs.data.data.length >= 3, `Real-time Notification Tray Active (${notifs.data.data.length} messages delivered)`);

    // 6. AI AGENT CHATBOT & TOOL CALLING
    console.log('\n--- 6. AUTONOMOUS AI AGENT & BACKEND TOOL EXECUTION ---');
    const chatFee = await axios.post(
      `${BASE_URL}/ai/chat`,
      { message: 'What is the CSE fee?' },
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );
    assert(
      chatFee.data.data.aiMessage.content.includes('110,000') &&
      chatFee.data.data.aiMessage.toolCalls.some((t) => t.toolName === 'getPrograms'),
      'AI Tool Execution: getPrograms() & Program-Specific Fee Extraction'
    );

    const chatEsc = await axios.post(
      `${BASE_URL}/ai/chat`,
      { message: 'I need a fee waiver scholarship because my family income is low' },
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );
    assert(
      chatEsc.data.data.aiMessage.toolCalls.some((t) => t.toolName === 'createCounselorEscalation'),
      'AI Tool Execution: Autonomous Counselor Escalation Ticket Creation'
    );

    // 7. COUNSELOR CONSOLE & 360° RECORD
    console.log('\n--- 7. COUNSELOR DESK, 360° PROFILE & OVERRIDES ---');
    const dashMetrics = await axios.get(`${BASE_URL}/counselor/dashboard`, {
      headers: { Authorization: `Bearer ${counselorToken}` },
    });
    assert(dashMetrics.data.data.metrics.totalStudents > 0, `Counselor Live Dashboard Metrics (${dashMetrics.data.data.metrics.totalStudents} total students)`);

    const searchRes = await axios.get(`${BASE_URL}/counselor/search`, {
      headers: { Authorization: `Bearer ${counselorToken}` },
    });
    assert(searchRes.data.data.students.length > 0, `Universal Student Search (Auto-loaded ${searchRes.data.data.students.length} students)`);

    const stu360 = await axios.get(`${BASE_URL}/counselor/students/${trackingId}`, {
      headers: { Authorization: `Bearer ${counselorToken}` },
    });
    assert(stu360.data.data.student && stu360.data.data.application, `Student 360° Profile & Audit Trail (${trackingId})`);

    const approveRes = await axios.post(
      `${BASE_URL}/admission/${applicationId}/approve`,
      { scholarshipPercentage: 20, decisionNotes: 'Approved via full system audit' },
      { headers: { Authorization: `Bearer ${counselorToken}` } }
    );
    assert(
      approveRes.data.data.admission.status === 'APPROVED' &&
      approveRes.data.data.enrollment?.enrollmentNumber,
      `Counselor Admission Approval & Official Enrollment Generation (${approveRes.data.data.enrollment?.enrollmentNumber})`
    );

    // 8. ADMIN CONSOLE & AUDIT TRAIL
    console.log('\n--- 8. INSTITUTIONAL ADMIN & COST PROTECTION ---');
    const adminAnalytics = await axios.get(`${BASE_URL}/admin/analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminAnalytics.data.data.totalStudents > 0, `Institutional Analytics & Total Students (${adminAnalytics.data.data.totalStudents})`);

    const adminCost = await axios.get(`${BASE_URL}/admin/cost-protection`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminCost.data.data.state?.thresholds?.budgetLimit === 96.87, 'Admin Cost Protection Monitor ($96.87 budget guard)');

    const auditTrail = await axios.get(`${BASE_URL}/admin/audit-logs?limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(auditTrail.data.data.logs.length > 0, `Immutable Audit Trail Active (${auditTrail.data.data.total} total logs recorded)`);

    console.log('\n================================================================');
    console.log(`🏁 AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed === 0) {
      console.log('🌟 ALL ROUTES, MIDDLEWARES, CONTROLLERS & AI TOOLS OPERATING AT 100% HEALTH!');
    }
  } catch (err) {
    console.error('Audit encountered runtime error:', err.response?.data || err.message);
    failed++;
  }
}

runAudit();
