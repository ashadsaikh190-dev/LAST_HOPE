variable "aws_region" {
  type        = string
  description = "AWS deployment region"
  default     = "ap-south-1"
}

variable "environment" {
  type        = string
  description = "Deployment environment (e.g. dev, staging, prod)"
  default     = "prod"
}

variable "budget_limit" {
  type        = string
  description = "AWS Monthly Budget limit in USD"
  default     = "60"
}

variable "admin_email" {
  type        = string
  description = "Administrator email for AWS Budget threshold alerts"
  default     = "admin@university.edu"
}
