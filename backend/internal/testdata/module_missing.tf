resource "aws_lambda_function" "fn" {
  function_name = "my-fn"
  role          = module.nonexistent.lambda_role_arn
  runtime       = "python3.11"
}
