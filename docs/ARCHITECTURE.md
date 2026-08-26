# Autonomous Admissions Platform Architecture

## Executive Overview
The **Autonomous Admissions & Student Lifecycle Conversion Platform** is an enterprise-grade, distributed platform designed to autonomously manage prospective student inquiries, applications, document collection, OCR verification, eligibility determination, and official enrollment issuance while reducing admissions counselor workload to high-value interactions, special fee waivers, and edge-case exceptions.

---

## 1. Dual Identity Architecture
To ensure complete immutability and lifecycle integrity across all touchpoints, the platform separates prospective student tracking from official enrolled status:

1. **Student Tracking ID** (`STU-YYYY-XXXXX`):
   - Cryptographically allocated immediately upon initial registration.
   - Permanent, indexed, and immutable across the student's entire history.
   - Referenced across all logs, documents, S3 paths, payments, and AI conversations.

2. **Official Enrollment Number** (`GIET<YYYY><DEPT><6-DIGIT-SEQ>`):
   - Issued **only** after complete satisfaction of all institutional conditions:
     1. Application submitted and finalized
     2. Required identity and academic documents verified via Amazon Textract
     3. Deterministic academic eligibility criteria satisfied
     4. Application/tuition fee paid and verified (or fee waiver approved)
     5. Formal admission offer approved by institutional authority
   - Strictly idempotent: repeated enrollment triggers return the identical enrollment record without duplicates.

---

## 2. Distributed Lifecycle State Machine
```
REGISTERED
    ↓
LEAD
    ↓
APPLICATION_STARTED
    ↓
APPLICATION_COMPLETED
    ↓
DOCUMENTS_PENDING
    ↓
DOCUMENT_VERIFICATION (Textract OCR)
    ↓
ELIGIBILITY_CHECK (Deterministic Rules)
    ↓
PAYMENT_PENDING (Server-verified)
    ↓
ADMISSION_REVIEW
    ↓
ADMISSION_APPROVED
    ↓
ENROLLMENT_GENERATED
    ↓
ENROLLED
```

---

## 3. Subsystem Interconnection

```
[React + Vite Frontend]
       │
       │ REST API / WebSockets
       ▼
[Node.js + Express Backend] ◄──(HMAC Tool Proxy)──► [Python FastAPI AI Agent]
       │
  ┌────┼──────────────┬──────────────┬──────────────┐
  ▼    ▼              ▼              ▼              ▼
[MongoDB]        [Amazon S3]   [Amazon SQS]   [Amazon SES]   [CloudWatch]
(State & Meta)  (Private Docs) (OCR & Queues)  (Emails)     (Logs & Metrics)
```

---

## 4. AI Tool Execution & Safety
The AI Agent operates strictly through 17 authorized backend tools. It never directly mutates or queries MongoDB. When confidence drops below threshold or a student requests a fee waiver or human assistance, an escalation case is automatically generated with a structured summary for counselors.
