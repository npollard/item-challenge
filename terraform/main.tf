########################################
# DynamoDB Table
########################################

resource "aws_dynamodb_table" "exam_items" {
  name         = "${var.table_name}-${var.env}"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "PK"
  range_key = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.env
    Service     = "exam-items"
  }
}

########################################
# IAM Role for Lambda
########################################

resource "aws_iam_role" "lambda_role" {
  name = "${var.lambda_name}-${var.env}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

########################################
# Attach Basic Logging Policy
########################################

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

########################################
# DynamoDB Access Policy
########################################

resource "aws_iam_policy" "dynamo_policy" {
  name = "${var.lambda_name}-${var.env}-dynamo"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:UpdateItem",
        "dynamodb:TransactWriteItems"
      ]
      Resource = [
        aws_dynamodb_table.exam_items.arn,
        "${aws_dynamodb_table.exam_items.arn}/index/*"
      ]
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_dynamo_attach" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.dynamo_policy.arn
}

########################################
# Lambda Function
########################################

resource "aws_lambda_function" "api" {
  function_name = "${var.lambda_name}-${var.env}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"

  s3_bucket = var.lambda_s3_bucket
  s3_key    = var.lambda_s3_key

  timeout = 10

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.exam_items.name
      ENV        = var.env
    }
  }

  tags = {
    Environment = var.env
    Service     = "exam-items"
  }
}

########################################
# API Gateway HTTP API
########################################

resource "aws_apigatewayv2_api" "http_api" {
  name          = "${var.lambda_name}-${var.env}-api"
  protocol_type = "HTTP"
}

########################################
# Lambda Integration
########################################

resource "aws_apigatewayv2_integration" "lambda" {
  api_id           = aws_apigatewayv2_api.http_api.id
  integration_type = "AWS_PROXY"

  integration_uri = aws_lambda_function.api.invoke_arn
}

########################################
# Catch-all Route (Proxy)
########################################

resource "aws_apigatewayv2_route" "proxy" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "ANY /{proxy+}"

  target = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

########################################
# Default Route (root path)
########################################

resource "aws_apigatewayv2_route" "root" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "ANY /"

  target = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

########################################
# Stage (auto deploy)
########################################

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}

########################################
# Lambda Permission for API Gateway
########################################

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}