# AWS Deployment & Cost Optimization Guide

## Infrastructure Services Provisioned via Terraform
The platform provisions the following AWS architecture:
1. **Amazon S3**: Private encrypted bucket for student marksheets and identity proofs with pre-signed URLs.
2. **Amazon Textract**: Asynchronous and synchronous OCR extraction for educational certificates.
3. **Amazon SQS**: Document processing queue with Dead Letter Queue (DLQ) redrive policy.
4. **Amazon SES**: Production-ready transactional email dispatch.
5. **Amazon CloudWatch**: Custom metric publishing (`AutonomousAdmissions/Operations`) and log groups.
6. **AWS IAM**: Least privilege application runtime role.

---

## Deployment Steps
1. **Terraform Apply**:
   ```bash
   cd infrastructure/terraform
   cp terraform.tfvars.example terraform.tfvars
   terraform init
   terraform apply
   ```

2. **Environment Variables**:
   Copy outputs from Terraform into `.env`.

3. **Cost Control Safeguards**:
   - Private S3 lifecycle expiration rules for archived superseded files.
   - SQS standard queues with dead-letter queue backoff.
   - CloudWatch 30-day retention policies.
   - Local fallback provider enabled automatically when AWS credentials are not set during local testing.
