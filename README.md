# 🎓 Autonomous Admissions & Student Lifecycle Conversion Platform
### **GIET University Enterprise Admissions Engine**

[![Platform Status](https://img.shields.io/badge/System_Health-100%25_Operational-emerald?style=for-the-badge&logo=shield)](http://localhost:5000/health)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=for-the-badge&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-1.0.0-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![AWS SDK v3](https://img.shields.io/badge/AWS_SDK-v3_(ap--south--1)-FF9900?style=for-the-badge&logo=amazon-aws)](https://aws.amazon.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_8-47A248?style=for-the-badge&logo=mongodb)](https://mongodb.com)

---

## 📌 Executive Summary

The **Autonomous Admissions & Student Lifecycle Conversion Platform** is a distributed, production-grade university admissions system. It autonomously manages student inquiries, 4-step applications, 8-document academic suites, **Amazon Textract OCR** consistency verification, deterministic eligibility scoring, fee payments, and official sequential enrollment number generation while reducing admissions counselor workload to human-in-the-loop exceptions, fee waivers, and edge cases.

---

## 🚀 Key Features

### 1. 🎓 **Student Experience & 12-Stage Lifecycle Engine**
- **State Machine Guarded Journey**: Strict state machine transitions (`REGISTERED` &rarr; `LEAD` &rarr; `APPLICATION_STARTED` &rarr; `APPLICATION_COMPLETED` &rarr; `DOCUMENTS_PENDING` &rarr; `DOCUMENT_VERIFICATION` &rarr; `ELIGIBILITY_CHECK` &rarr; `PAYMENT_PENDING` &rarr; `ADMISSION_REVIEW` &rarr; `ADMISSION_APPROVED` &rarr; `ENROLLMENT_GENERATED` &rarr; `ENROLLED`).
- **4-Step Wizard**: Personal Info, Academic Qualifications (10th/12th PCM/PCB), Program Selection, and Document Upload.
- **Official Student Card**: Issues digital ID cards with verifiable QR/Barcode, Roll Number, Academic Batch, and Program Code upon enrollment.

### 2. 🤖 **Autonomous AI Admissions Counselor (FastAPI Microservice)**
- **Multi-Turn Conversational Assistant**: Floating AI widget powered by Python FastAPI on port `8000`.
- **Autonomous Tool Dispatcher**: Zero direct database access for AI; executes secure backend tools:
  - `getPrograms()` & `getProgramFeeBreakdown()`
  - `getEligibilityCriteria()`
  - `getStudentStatus()`
  - `createCounselorEscalation()` (Auto-generates structured counselor tickets for financial aid or complex edge cases)
  - `calculateScholarshipEstimate()`
- **Dynamic Intent & Persona State**: Tracks student sentiment, engagement level, and intent level in real time.

### 3. 📄 **Complete 8-Document University Admission Suite & OCR**
- **Full Standard Admission Slots**:
  1. 🪪 **`IDENTITY_PROOF`** (Aadhaar Card / Passport / Voter ID)
  2. 📄 **`MARKSHEET_10TH`** (10th Standard Marksheet & Passing Certificate)
  3. 📄 **`MARKSHEET_12TH`** (12th Standard Marksheet & Passing Certificate)
  4. 📜 **`TRANSFER_CERTIFICATE`** (School / College Leaving TC)
  5. 🏛️ **`MIGRATION_CERTIFICATE`** (Board / University Migration Certificate)
  6. 📸 **`PASSPORT_PHOTO`** (Passport Size Color Photograph)
  7. 📋 **`INCOME_CERTIFICATE`** (Income & Asset Certificate for Scholarships)
  8. ⚖️ **`CATEGORY_CERTIFICATE`** (Caste / Quota Certificate)
- **Amazon Textract OCR**: Automated key-value entity extraction (Name, Marks, Board, Roll No, Passing Year) with fuzzy consistency validation against declared application records.
- **S3 Private Storage**: Versioned S3 storage (`v1` &rarr; `SUPERSEDED`, `v2` &rarr; `CURRENT`) with secure pre-signed viewing URLs.

### 4. 👩‍💼 **Counselor 360° Review Desk & Exception Management**
- **Universal Instant Search**: Search any candidate in milliseconds by Student Tracking ID, Official Enrollment Number, Application ID, Name, or Email.
- **360° Student Record**: Unified single-page profile with application timeline, uploaded documents, OCR confidence scores, eligibility breakdown, fee ledger, and immutable audit logs.
- **Visual OCR Diff Viewer & Overrides**: Inspect discrepancies between declared application data and Textract extractions, apply manual verification overrides, or request document replacements with custom feedback.
- **AI Escalation Desk**: Real-time queue of cases automatically escalated by the AI agent.

### 5. 💳 **Idempotent Payment Engine & Financial Receipts**
- **Dual Fee Support**: Handles Application Fees (₹1,000) and Academic Tuition Fees (e.g. ₹1,10,000 for B.Tech CSE).
- **Idempotency Safeguard**: Ensures candidates are never double-charged across retried requests.
- **Instant Printable Receipts**: Generates branded transaction receipts (`REC-YYYY-XXXXXX`) with UPI/Card transaction reference IDs.
- **Fee Waiver Workflow**: Integrated counselor fee-waiver request and approval engine for economically weaker sections.

### 6. 🔔 **Multi-Channel Real-Time Notifications**
- **Amazon SES**: Transactional email dispatch for registrations, application confirmations, fee receipts, and official enrollment letters.
- **Amazon SNS**: Transactional SMS alert dispatch to student mobile numbers.
- **Real-Time WebSockets (`Socket.IO`)**: Instant badge updates and notification toasts on both desktop and mobile browsers.
- **In-App Notification Drawer**: Central notification center with unread counters and 1-click "Mark as Read".

### 7. 👑 **Institutional Admin Console & AWS Cost Circuit Breakers**
- **Conversion Funnel Analytics**: Dynamic real-time stage distribution across leads, applicants, payments, and enrollments.
- **AWS Cost Safeguards & Circuit Breakers**:
  - **$50 Emergency Kill Cap**: Automatically pauses expensive AWS API operations if thresholds are breached.
  - **$96.87 Hard Ceiling**: Hard boundary budget protection.
  - **Retry Protection Engine**: Capped at 3 attempts with exponential backoff and DLQ routing.
- **Staff User Management**: Create and manage Counselor and Admin credentials.
- **Academic Programs Catalog**: Configure tuition fees, intake caps, eligibility cutoffs, and department codes.
- **Immutable Audit Trail**: Cryptographically secure, filterable audit log of every system and human decision.

---

## 🛠️ Complete Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite 6, Tailwind CSS, Lucide Icons, Socket.IO Client, Axios, Canvas Confetti |
| **Backend Core** | Node.js (v18+), Express 4, MongoDB, Mongoose 8, JWT Authentication, Bcrypt.js, Helmet, Express Rate Limit, Morgan, Multer |
| **AI Agent Service** | Python 3.11, FastAPI, Uvicorn, AsyncIO, Pydantic, Intent & Persona Engines, Backend Tool Dispatcher |
| **AWS Cloud (SDK v3)** | Amazon S3, Amazon Textract, Amazon SQS, Amazon SES, Amazon SNS, Amazon CloudWatch, CloudWatch Logs, Terraform IaC |
| **Real-Time Layer** | Socket.IO WebSockets (Room-based student channels & counselor broadcast rooms) |

---

## 🏛️ System Architecture & Dual Identifiers

```
+----------------------------------------------------------------------------------------------------+
|                                    GIET UNIVERSITY ADMISSIONS                                      |
+----------------------------------------------------------------------------------------------------+
                                                  │
                  ┌───────────────────────────────┴───────────────────────────────┐
                  ▼                                                               ▼
        [ 🎓 Student Portal ]                                           [ 👩‍💼 Counselor & Admin ]
     (http://localhost:5173)                                         (http://localhost:5173/counselor)
                  │                                                               │
                  └───────────────────────────────┬───────────────────────────────┘
                                                  ▼
                                      [ Node.js Express API ]
                                       (http://localhost:5000)
                                                  │
                         ┌────────────────────────┼────────────────────────┐
                         ▼                        ▼                        ▼
                 [ MongoDB 8.0 ]        [ FastAPI AI Agent ]     [ AWS Cloud (ap-south-1) ]
               - Students & Users      (http://localhost:8000)   - S3 (Private Docs)
               - Applications           - Tool Dispatcher        - Textract (OCR)
               - Documents & OCR        - Persona Engine         - SQS (Async Queues)
               - Payments & Ledger      - Intent Detection       - SES (Email Dispatch)
               - Audit Trail            - Escalations            - SNS (SMS Gateway)
                                                                 - Cost Breakers ($96.87)
```

### **Dual Identifier Lifecycle:**
1. **Permanent Student Tracking ID (`STU-YYYY-XXXXX`)**: Issued dynamically at registration; permanently tracks the candidate across all uploads, chat logs, and payments.
2. **Official Enrollment Number (`GIET<YYYY><DEPT><6-DIGIT-SEQ>`)**: Issued **only** upon complete institutional approval and prerequisite satisfaction (e.g. `GIET2026CSE000002`).

---

## 🔑 Pre-Configured Access Credentials

| Portal | URL | Email | Password |
| :--- | :--- | :--- | :--- |
| **👑 Admin Console** | [http://localhost:5173/admin](http://localhost:5173/admin) | `admin@university.edu` | `AdminPassword123!` |
| **👩‍💼 Counselor Desk** | [http://localhost:5173/counselor](http://localhost:5173/counselor) | `counselor@university.edu` | `CounselorPassword123!` |
| **🎓 Student Portal** | [http://localhost:5173/dashboard](http://localhost:5173/dashboard) | `audit_51788@test.edu` | `AuditPassword123!` |
| **📱 Mobile / LAN Access** | `http://172.33.0.36:5173` | *(Any role credential above)* | *(Corresponding password)* |

> ⚡ **Quick Switcher**: Click the `🎓 Student`, `👩‍💼 Counselor`, or `👑 Admin` pills in the top navbar to instantly test different role perspectives.

---

## 🚀 Installation & Running Locally

### 1. Prerequisites
- **Node.js**: v18.0.0+
- **Python**: 3.10+
- **MongoDB**: Running locally at `mongodb://127.0.0.1:27017`

---

### 2. Backend Service Setup
```bash
cd backend
npm install
npm run seed      # Idempotently provisions academic programs, cutoffs, and staff
npm start         # Starts backend on http://localhost:5000
```

---

### 3. Python AI Agent Service Setup
```bash
cd ai-agent
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

---

### 4. Frontend Application Setup
```bash
cd frontend
npm install
npm run dev       # Starts Vite on http://localhost:5173 (Network: http://172.33.0.36:5173)
```

---

## 🧪 Comprehensive Automated System Audit

Run the master 24-point end-to-end architectural test suite:
```bash
cd backend
node ./src/scripts/full_system_audit.js
```

### **Verified Test Coverage:**
```
================================================================
🔬 COMPLETE ARCHITECTURAL & END-TO-END AUDIT REPORT
================================================================

--- 1. SYSTEM HEALTH & AWS METRICS AUDIT ---
  ✅ [PASS] Backend Health Endpoint (HTTP 200 HEALTHY)
  ✅ [PASS] MongoDB Connection Active
  ✅ [PASS] Amazon Web Services Configured (ap-south-1)
  ✅ [PASS] AWS Hard Limit Ceiling ($96.87 Safeguard)
  ✅ [PASS] Python FastAPI AI Agent Service Healthy (Port 8000)

--- 2. PROGRAM CATALOG & FEE MATRIX AUDIT ---
  ✅ [PASS] Academic Programs Catalog (5 active degrees)
  ✅ [PASS] B.Tech CSE Fee & Duration Accuracy (₹1,10,000 / yr | 4 Years)

--- 3. AUTHENTICATION, ROLES & MIDDLEWARE AUDIT ---
  ✅ [PASS] Student User Registration & JWT Issuance
  ✅ [PASS] Counselor Authentication & Role Claims
  ✅ [PASS] Admin Authentication & Role Claims

--- 4. STUDENT LIFECYCLE & APPLICATION PIPELINE ---
  ✅ [PASS] Application Submission
  ✅ [PASS] Complete 8 University Admission Document Slots Provisioned

--- 5. PAYMENT RECONCILIATION & NOTIFICATIONS ---
  ✅ [PASS] Idempotent Payment Order Creation (₹1,000 Application Fee)
  ✅ [PASS] Payment Success Reconciliation & Receipt Issuance
  ✅ [PASS] Real-time Notification Tray Active & Dispatched

--- 6. AUTONOMOUS AI AGENT & BACKEND TOOL EXECUTION ---
  ✅ [PASS] AI Tool Execution: getPrograms() & Program-Specific Fee Extraction
  ✅ [PASS] AI Tool Execution: Autonomous Counselor Escalation Ticket Creation

--- 7. COUNSELOR DESK, 360° PROFILE & OVERRIDES ---
  ✅ [PASS] Counselor Live Dashboard Metrics
  ✅ [PASS] Universal Student Search
  ✅ [PASS] Student 360° Profile & Audit Trail
  ✅ [PASS] Counselor Admission Approval & Official Enrollment Generation

--- 8. INSTITUTIONAL ADMIN & COST PROTECTION ---
  ✅ [PASS] Institutional Analytics & Total Students
  ✅ [PASS] Admin Cost Protection Monitor ($96.87 budget guard)
  ✅ [PASS] Immutable Audit Trail Active (160+ total logs recorded)

================================================================
🏁 AUDIT COMPLETE: 24 PASSED, 0 FAILED (100% OPERATIONAL)
================================================================
```

---

## 📡 REST API Directory

| Domain | Route | Method | Access | Description |
| :--- | :--- | :---: | :---: | :--- |
| **Health** | `/health` | `GET` | Public | Live health checks for DB, S3, SQS, SES, Textract & Cost limits |
| **Auth** | `/api/auth/register` | `POST` | Public | Register new student & auto-generate Tracking ID |
| **Auth** | `/api/auth/login` | `POST` | Public | Authenticate user & return JWT token |
| **Programs**| `/api/programs` | `GET` | Public | List all active university degree programs & fees |
| **Application**| `/api/applications` | `POST` | Student | Submit completed 4-step admission application |
| **Documents**| `/api/documents` | `GET` | Student/Staff | List student document slots & OCR statuses |
| **Documents**| `/api/documents/upload` | `POST` | Student | Upload document to S3 & trigger Textract OCR |
| **Payment** | `/api/payments/create` | `POST` | Student | Create idempotent payment order |
| **Payment** | `/api/payments/:id/simulate-checkout` | `POST` | Student | Reconcile payment & issue receipt |
| **Counselor**| `/api/counselor/search` | `GET` | Counselor/Admin | Universal search by Tracking ID, App ID, Name, or Email |
| **Counselor**| `/api/counselor/students/:trackingId` | `GET` | Counselor/Admin | Fetch complete 360° student record & audit logs |
| **Counselor**| `/api/counselor/documents/:id/verify-override` | `POST` | Counselor/Admin | Manual OCR verification override |
| **Admission**| `/api/admission/:applicationId/approve` | `POST` | Counselor/Admin | Approve admission & issue official Enrollment Number |
| **Admin** | `/api/admin/analytics` | `GET` | Admin | Institutional conversion funnel & stage distribution |
| **Admin** | `/api/admin/cost-protection` | `GET` | Admin | Real-time AWS spending meters & emergency controls |
| **AI Agent**| `/api/ai/chat` | `POST` | Student/Staff | Conversational chatbot with autonomous tool execution |

---

## 🛡️ Security & Production Compliance
- **Zero Raw Data Leaks**: Secure HTTP-only and JWT bearer tokens with role-level router guards.
- **Private S3 Encrypted Storage**: Zero public S3 bucket policies; all file viewing uses time-limited presigned URLs.
- **Strict Rate Limiting & Helmet**: Protection against brute-force and common web vulnerabilities.
- **Immutable Cryptographic Audit Trail**: Every status change, login, payment, and counselor override is logged with actor metadata, IP address, and timestamp.
