# RDS PostgreSQL Instance
resource "aws_db_subnet_group" "rds_subnet_group" {
  name       = "finai-db-subnet-final"
  subnet_ids = [aws_subnet.private_subnet_1.id, aws_subnet.private_subnet_2.id]

  tags = {
    Name = "FinAI DB Subnet Group"
  }
}

resource "aws_db_instance" "finai_postgres" {
  identifier             = "finai-postgres-final"
  engine                 = "postgres"
  engine_version         = "15"
  instance_class         = "db.t3.micro"
  allocated_storage      = 20
  db_name                = "finaidb"
  username               = "postgres"
  password               = "SuperSecretPassword123!"
  db_subnet_group_name   = aws_db_subnet_group.rds_subnet_group.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  skip_final_snapshot    = true
  publicly_accessible    = false
}

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
