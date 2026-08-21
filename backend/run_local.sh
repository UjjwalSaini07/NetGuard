#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "No .env found, copying .env.example -> .env"
  cp .env.example .env
fi

export RUNTIME_MODE=local
set -a
source .env
set +a

uvicorn app.main:app --reload --port 8000
