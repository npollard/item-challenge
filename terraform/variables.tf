variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "env" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "lambda_name" {
  default = "exam-items-api"
}

variable "table_name" {
  default = "ExamItems"
}

variable "lambda_s3_bucket" {
  description = "S3 bucket containing Lambda artifact"
  type        = string
}

variable "lambda_s3_key" {
  description = "Path to Lambda zip"
  type        = string
}