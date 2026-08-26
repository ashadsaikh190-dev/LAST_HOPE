# API Documentation

## Base URL
`/api`

## Authentication & Authorization
All secured endpoints require the HTTP header:
`Authorization: Bearer <JWT_TOKEN>`

Roles: `STUDENT`, `COUNSELOR`, `ADMIN`

---

## 1. Authentication Endpoints
- `POST /api/auth/register` - Register new student and allocate permanent Student Tracking ID (`STU-YYYY-XXXXX`).
- `POST /api/auth/login` - Authenticate user and issue JWT.
- `GET /api/auth/me` - Get current session context.

---

## 2. Student Endpoints
- `GET /api/students/me` - Get student profile and active lifecycle stage.
- `PUT /api/students/me` - Update contact and address information.
- `GET /api/students/timeline` - Retrieve complete immutable audit event history.
- `GET /api/students/notifications` - Retrieve multi-channel delivery logs.
- `POST /api/students/request-fee-waiver` - Submit fee waiver request (escalates to counselor).

---

## 3. Application Endpoints
- `POST /api/applications` - Submit application and generate program document requirements.
- `GET /api/applications/me` - Retrieve current student application.
- `GET /api/applications/:id` - Retrieve application details by ID.

---

## 4. Document & Verification Endpoints
- `GET /api/documents` - List student documents with OCR verification status.
- `POST /api/documents/upload` - Upload document to S3 and queue Textract OCR.
- `POST /api/documents/:id/replace` - Replace document with new version (`v1` -> `SUPERSEDED`, `v2` -> `CURRENT`).
- `GET /api/documents/:id/versions` - Retrieve version history.

---

## 5. Eligibility & Payment Endpoints
- `GET /api/eligibility/:applicationId` - Retrieve or evaluate deterministic qualification status.
- `POST /api/payments/create` - Create idempotent payment intent.
- `POST /api/payments/:id/simulate-checkout` - Complete gateway checkout and verify receipt.

---

## 6. Admission & Enrollment Endpoints
- `GET /api/admission/me` - Retrieve admission offer and merit scholarship.
- `POST /api/admission/:applicationId/approve` - Approve admission and automatically issue official Enrollment Number.
- `GET /api/enrollment/me` - Retrieve official university student card.
- `POST /api/enrollment/generate` - Idempotent enrollment generation service.

---

## 7. AI Agent & Tool Proxy Endpoints
- `POST /api/ai/chat` - Multi-turn conversational endpoint with real-time tool calling.
- `GET /api/ai/conversations` - Message transcript history.
- `POST /api/ai/tool-execute` - Authorized proxy for AI tools (`X-AI-Secret-Key` required).

---

## 8. Counselor & Admin Endpoints
- `GET /api/counselor/dashboard` - Real-time database aggregated metrics & conversion funnel.
- `GET /api/counselor/search?q=...` - Universal search across Tracking IDs, Enrollment Numbers, and Emails.
- `GET /api/counselor/students/:trackingId` - Full 360° authorized lifecycle record.
- `GET /api/counselor/cases` - Escalation inbox.
- `POST /api/counselor/cases/:id/resolve` - Resolve case with decision and notes.
- `POST /api/counselor/documents/:id/verify-override` - Manual document approval/rejection override.
- `GET /api/admin/analytics` - Institutional metrics and stage distributions.
- `GET /api/admin/audit-logs` - Filterable audit log queries.
- `GET /health` - Comprehensive live health verification.
