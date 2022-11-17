#!/usr/bin/env bash
set -e

RELEASE_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "Publishing new app builds for release channel: $RELEASE_BRANCH"

ENV_FILE="./.env.$RELEASE_BRANCH"
echo "getting environment variables from $ENV_FILE"

rm -rf ./dist

npx env-cmd -f $ENV_FILE eas update --auto

say "over-the-air update published successfully"
