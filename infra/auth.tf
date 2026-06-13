# Amazon Cognito User Pool
resource "aws_cognito_user_pool" "finai_pool" {
  name = "finai-user-pool"

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  auto_verified_attributes = ["email"]
  username_attributes      = ["email"]
}

# Cognito App Client (for the React Frontend)
resource "aws_cognito_user_pool_client" "finai_client" {
  name         = "finai-frontend-client"
  user_pool_id = aws_cognito_user_pool.finai_pool.id

  generate_secret = false
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]
}
