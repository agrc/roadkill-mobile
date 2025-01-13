#!/usr/bin/env bash
set -e

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ $CURRENT_BRANCH == "main" ]; then
  export CHANNEL="production"
elif [ $CURRENT_BRANCH == "dev" ]; then
  export CHANNEL="staging"
fi

echo "Setting channel to: $CHANNEL"
