#!/usr/bin/env bash
set -e

. ./scripts/setChannel.sh

echo "Publishing new app builds for release channel: $CHANNEL"

ENV_FILE="./.env.$CHANNEL"
echo "getting environment variables from $ENV_FILE"

rm -rf ./dist

echo "publishing OTA update"
npx env-cmd -f $ENV_FILE eas update --auto --json --non-interactive

echo "uploading sourcemaps to sentry"
npx sentry-expo-upload-sourcemaps dist

say "over-the-air update published successfully"
