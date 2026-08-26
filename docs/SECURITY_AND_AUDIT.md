# Security Architecture & Audit Trail Specification

## 1. Authentication & RBAC
- Stateless JWT authentication with HMAC SHA-256 signature verification.
- Role-based authorization:
  - `STUDENT`: Can access strictly their own profile, application, documents, payments, and notifications.
  - `COUNSELOR`: Can search and view student records, resolve escalated cases, and apply manual verification overrides.
  - `ADMIN`: Full authority over program catalogs, eligibility criteria, staff accounts, and system configuration.

## 2. Zero Direct Database Access for AI
- The Python AI service has zero credentials or connection to MongoDB.
- All institutional data retrieval and state modification must pass through the authorized Node.js backend tool execution endpoint (`/api/ai/tool-execute`) validated via an internal HMAC secret key (`X-AI-Secret-Key`).

## 3. Cryptographic & Immutable Audit Logging
Every significant event creates an `AuditLog` record containing:
- `actorId` and `actorType` (`STUDENT`, `COUNSELOR`, `ADMIN`, `AI_AGENT`, `SYSTEM`, `WEBHOOK`)
- `trackingId`
- `action` (e.g. `STUDENT_REGISTERED`, `DOCUMENT_UPLOADED`, `DOCUMENT_VERIFICATION_PROCESSED`, `OFFICIAL_ENROLLMENT_GENERATED`)
- `result` (`SUCCESS`, `FAILURE`, `WARNING`)
- `metadata` (JSON payload)
- `ipAddress` and `userAgent`
- `timestamp`
