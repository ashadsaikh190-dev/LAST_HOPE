# Autonomous Admissions & Student Lifecycle Conversion Platform

An autonomous, production-style, distributed admissions platform designed to autonomously manage prospective student inquiries, applications, document collection, Amazon Textract OCR consistency verification, deterministic eligibility checks, and official enrollment issuance while reducing admissions counselor workload to exceptions, fee waivers, and edge cases.

---

## Key Features

1. **Zero Hardcoded Data & Clean Empty State Guarantee**:
   - Operates flawlessly from an initial 0-student database.
   - All statistics, metrics, and conversion funnels are dynamically calculated from MongoDB and AWS queries.
   - Institutional catalog (programs, cutoffs, default staff) provisioned via an idempotent seed script.

2. **Dual Identifier Architecture**:
   - **Permanent Student Tracking ID** (`STU-YYYY-XXXXX`): Generated dynamically upon student registration; immutable and referenced across all documents, logs, and events.
   - **Official Enrollment Number** (`GIET<YYYY><DEPT><6-DIGIT-SEQ>`): Issued **only** after complete satisfaction of all prerequisites (Application completed, Documents verified, Eligibility approved, Payment verified, Admission approved). Strictly idempotent.

3. **Autonomous AI Agent + 17 Secure Tools**:
   - Python FastAPI agent service (`/ai/chat`, `/ai/analyze-intent`, `/ai/generate-persona`, `/ai/summarize-case`, `/ai/decide-next-action`).
   - Zero direct MongoDB access for AI. All institutional operations execute through authorized backend tool endpoints.
   - Autonomous counselor escalation engine with structured summaries.

4. **AWS SDK v3 Integrations**:
   - **Amazon S3**: Private bucket with versioning (`v1` -> `SUPERSEDED`, `v2` -> `CURRENT`) and pre-signed viewing URLs.
   - **Amazon Textract**: Automated OCR entity extraction (Name, Marks, Board, Year) with fuzzy consistency validation against application records.
   - **Amazon SQS**: Asynchronous document processing and notification queues with Dead Letter Queue (DLQ).
   - **Amazon SES**: Multi-channel transactional email dispatch.
   - **CloudWatch**: Operational metrics and structured logging.
   - **Graceful Local Fallback**: Operates cleanly in local dev environments without AWS credentials.

5. **Three Modern Portals with Real-Time Socket.IO Synchronization**:
   - **Student Portal**: Dashboard with animated 12-stage Stepper, Application Wizard, Document Upload & Replacement, AI Assistant Widget, Payment Checkout, Admission Offer, and Official Student ID Card.
   - **Counselor Portal**: Dynamic Metrics Dashboard, Universal Search (by Tracking ID / Enrollment No / App ID / Email), Action Required Escalations Inbox, Document Review Desk with OCR Diff Viewer, and AI Conversation Monitor.
   - **Admin Portal**: Institutional Analytics, Program Manager, Staff Role Management, Immutable Audit Log Explorer, and Live AWS System Health Monitors.

---

## Monorepo Structure

```
autonomous-admissions/
├── frontend/             # React 18, Vite, Tailwind CSS, React Router, Socket.IO Client
├── backend/              # Node.js, Express, MongoDB/Mongoose, Socket.IO, AWS SDK v3
├── ai-agent/             # Python 3.11+, FastAPI, Pydantic, Intent/Persona/Escalation Engines
├── infrastructure/
│   └── terraform/        # AWS S3, SQS, IAM, CloudWatch IaC specifications
├── docker/               # Multi-stage Dockerfiles for frontend, backend, ai-agent
├── scripts/              # run_e2e_test.js, setup.sh
├── docs/                 # ARCHITECTURE.md, API_DOCUMENTATION.md, AWS_DEPLOYMENT.md, SECURITY_AND_AUDIT.md
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Quick Start & Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or later
- **npm**: v9.0.0 or later
- **Python**: 3.10+
- **MongoDB**: Running locally on `mongodb://127.0.0.1:27017` or MongoDB Atlas URI

---

### 2. Environment Configuration
Copy `.env.example` to `backend/.env`:
```bash
cp .env.example backend/.env
```

---

### 3. Backend Setup & Idempotent Database Seed
```bash
cd backend
npm install
npm run seed     # Idempotently provisions default programs & staff credentials
npm run dev      # Starts backend on http://localhost:5000
```

Default Seed Accounts:
- **Admin**: `admin@university.edu` / `AdminPassword123!`
- **Counselor**: `counselor@university.edu` / `CounselorPassword123!`

---

### 4. Python AI Agent Setup
```bash
cd ai-agent
pip install -r requirements.txt
python main.py   # Starts FastAPI agent on http://localhost:8000
```

---

### 5. Frontend Setup
```bash
cd frontend
npm install
npm run dev      # Starts Vite dev server on http://localhost:5173
```

---

## Running Full End-to-End Test Suite

Run the automated 15-step lifecycle verification script:
```bash
node scripts/run_e2e_test.js
```

This validates:
1. Idempotent database seed.
2. Candidate registration & permanent Tracking ID allocation (`STU-YYYY-XXXXX`).
3. Duplicate user prevention.
4. AI tool execution proxy.
5. Application submission (`APP-YYYY-XXXXX`).
6. S3 private document upload & versioning.
7. Textract OCR extraction & consistency validation.
8. Deterministic academic eligibility check.
9. Idempotent payment intent & receipt generation.
10. Admission approval.
11. Official institutional Enrollment Number issuance (`GIET2026CSE001247`).
12. Idempotent enrollment verification (duplicate safely prevented).
13. Universal Counselor Search by Enrollment Number.
14. Immutable audit trail verification.

---

## Docker Multi-Container Deployment

Run the entire stack with Docker Compose:
```bash
docker-compose up --build
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- AI Agent: `http://localhost:8000`
- MongoDB: `mongodb://localhost:27017`

---

## Security & Compliance
- Full immutable cryptographic audit trail recorded in `AuditLog` collection.
- Strict input validation and rate limiting on authentication routes.
- Least privilege IAM policies for AWS service access.
- AI Agent restricted from direct database access.
