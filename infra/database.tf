# DynamoDB Table (Session State)
resource "aws_dynamodb_table" "sessions_table" {
  name           = "FinAISessionsFinal"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "SessionId"

  attribute {
    name = "SessionId"
    type = "S"
  }

  tags = {
    Name = "finai-dynamodb-sessions"
  }
}

# S3 Bucket for PDF Reports
resource "aws_s3_bucket" "pdf_reports_bucket" {
  bucket = "finai-pdf-reports-${random_id.bucket_id.hex}"
}

resource "random_id" "bucket_id" {
  byte_length = 4
}
