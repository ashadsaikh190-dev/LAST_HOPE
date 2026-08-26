output "s3_bucket_name" {
  value       = aws_s3_bucket.student_documents.id
  description = "Amazon S3 private student document bucket name"
}

output "document_processing_queue_url" {
  value       = aws_sqs_queue.document_processing_queue.id
  description = "Amazon SQS document processing queue URL"
}

output "notification_queue_url" {
  value       = aws_sqs_queue.notification_queue.id
  description = "Amazon SQS notification queue URL"
}

output "iam_role_arn" {
  value       = aws_iam_role.app_runtime_role.arn
  description = "IAM Role ARN for application runtime"
}
