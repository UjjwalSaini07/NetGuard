#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${NETGUARD_STACK_NAME:-netguard}"
REGION="${AWS_REGION:-us-east-1}"

sam build --template-file template.yaml

sam deploy \
  --guided \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    NetGuardApiKey="${NETGUARD_API_KEY:?set NETGUARD_API_KEY before deploying}" \
    LogLevel="${LOG_LEVEL:-INFO}" \
    S3BucketRawResults="${S3_BUCKET_RAW_RESULTS:-}"
