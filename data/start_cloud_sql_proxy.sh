#!/usr/bin/env bash
set -e

if [ -z "$1" ] || [ $1 == "dev" ]; then
  ENV="dev"
  PORT=5432
else
  ENV="$1"
  PORT=5433
fi

echo "Starting Cloud SQL Proxy for $ENV environment on port $PORT"

cloud-sql-proxy "ut-dts-agrc-roadkill-$ENV:us-central1:app" --port $PORT
