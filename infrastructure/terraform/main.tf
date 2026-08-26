terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# =========================================================================
# 1. S3 Private Bucket for Student Documents (Zero Data Loss Protection)
# =========================================================================
resource "aws_s3_bucket" "student_documents" {
  bucket        = "${var.environment}-admissions-student-documents"
  force_destroy = false

  # CRITICAL SAFETY: Prevent accidental terraform destroy of student data
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Environment = var.environment
    Service     = "AutonomousAdmissions"
    Protection  = "ZeroDataLoss"
  }
}

resource "aws_s3_bucket_versioning" "student_documents_versioning" {
  bucket = aws_s3_bucket.student_documents.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "student_documents_encryption" {
  bucket = aws_s3_bucket.student_documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "student_documents_block_public" {
  bucket = aws_s3_bucket.student_documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle rule to archive older document versions automatically
resource "aws_s3_bucket_lifecycle_configuration" "student_documents_lifecycle" {
  bucket = aws_s3_bucket.student_documents.id

  rule {
    id     = "ArchiveNoncurrentVersions"
    status = "Enabled"

    filter {}

    noncurrent_version_transition {
      noncurrent_days = 90
      storage_class   = "STANDARD_IA"
    }
  }
}

# =========================================================================
# 2. SQS Queues for Asynchronous Processing (DLQ & Retries Capped)
# =========================================================================
resource "aws_sqs_queue" "document_dlq" {
  name                      = "${var.environment}-document-processing-dlq"
  message_retention_seconds = 1209600 # 14 days
}

resource "aws_sqs_queue" "document_processing_queue" {
  name                       = "${var.environment}-document-processing-queue"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 345600 # 4 days

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.document_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue" "notification_queue" {
  name                       = "${var.environment}-notification-queue"
  visibility_timeout_seconds = 60
}

# =========================================================================
# 3. CloudWatch Log Group (Conservative 30-Day Retention)
# =========================================================================
resource "aws_cloudwatch_log_group" "admissions_logs" {
  name              = "/aws/admissions/${var.environment}"
  retention_in_days = 30
}

# =========================================================================
# 4. AWS Budgets: Real Hard Spending Protection ($60 Cap with 4 Alerts)
# =========================================================================
resource "aws_budgets_budget" "admissions_cost_budget" {
  name              = "${var.environment}-admissions-monthly-budget"
  budget_type       = "COST"
  limit_amount      = var.budget_limit
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2026-01-01_00:00"

  # Alert 1: $30 (50%) -> WARNING
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.admin_email]
  }

  # Alert 2: $40 (66.67%) -> CRITICAL
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 66.67
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.admin_email]
  }

  # Alert 3: $50 (83.33%) -> EMERGENCY
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 83.33
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.admin_email]
  }

  # Alert 4: $60 (100%) -> HARD PROTECTION
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.admin_email]
  }
}

# =========================================================================
# 5. IAM Role & Instance Profile for EC2 Runtime (Least Privilege)
# =========================================================================
resource "aws_iam_role" "app_runtime_role" {
  name = "${var.environment}-admissions-app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_instance_profile" "app_instance_profile" {
  name = "${var.environment}-admissions-instance-profile"
  role = aws_iam_role.app_runtime_role.name
}

resource "aws_iam_policy" "app_permissions_policy" {
  name        = "${var.environment}-admissions-app-permissions"
  description = "Least-privilege policy for admissions platform (S3, Textract, SQS, SES, CloudWatch, Budgets)"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3StudentDocumentsAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.student_documents.arn,
          "${aws_s3_bucket.student_documents.arn}/*"
        ]
      },
      {
        Sid    = "TextractDocumentAnalysis"
        Effect = "Allow"
        Action = [
          "textract:DetectDocumentText",
          "textract:AnalyzeDocument"
        ]
        Resource = "*"
      },
      {
        Sid    = "SQSQueueOperations"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = [
          aws_sqs_queue.document_processing_queue.arn,
          aws_sqs_queue.notification_queue.arn
        ]
      },
      {
        Sid    = "SESEmailDispatch"
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:GetSendQuota"
        ]
        Resource = "*"
      },
      {
        Sid    = "CloudWatchMetricsAndLogs"
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:GetMetricData",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      },
      {
        Sid    = "BudgetsAndCostMonitoringRead"
        Effect = "Allow"
        Action = [
          "budgets:ViewBudget",
          "ce:GetCostAndUsage"
        ]
        Resource = "*"
      },
      {
        Sid    = "EmergencyEC2StopRestricted"
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:DescribeInstanceStatus",
          "ec2:StopInstances"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "attach_app_policy" {
  role       = aws_iam_role.app_runtime_role.name
  policy_arn = aws_iam_policy.app_permissions_policy.arn
}
