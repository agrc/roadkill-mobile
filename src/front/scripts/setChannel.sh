#!/usr/bin/env bash
set -e

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ $CURRENT_BRANCH == "main" ]; then
  export CHANNEL="production"
  export BRANCH="production"
elif [ $CURRENT_BRANCH == "dev" ]; then
  export CHANNEL="preview"
  export BRANCH="staging"
fi

echo "Setting channel to: $CHANNEL"
echo "Setting branch to: $BRANCH"
