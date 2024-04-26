#!/usr/bin/env bash
set -e

RELEASE_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "Publishing new app builds for release channel: $RELEASE_BRANCH"

ENV_FILE="./.env.$RELEASE_BRANCH"
echo "getting environment variables from $ENV_FILE"

rm -rf ./dist

echo "publishing OTA update"
npx env-cmd -f $ENV_FILE eas update --auto --json --non-interactive

echo "uploading sourcemaps to sentry"
npx sentry-expo-upload-sourcemaps dist

say "over-the-air update published successfully"
