#!/usr/bin/env bash
# build apps for simulators for testing before submitting to app stores
set -e

RELEASE_CHANNEL="$(./getReleaseChannel.sh)-sims"
echo "Building simulator builds for release channel: $RELEASE_CHANNEL"

RELEASE_BRANCH=$(git rev-parse --abbrev-ref HEAD)
ENV_FILE="./.env.$RELEASE_BRANCH"
STAGING_ENV_FILE="./.env.staging"
if [ ! -f "$ENV_FILE" ]; then
  echo "No environment file found for $RELEASE_BRANCH; using $STAGING_ENV_FILE instead"
  ENV_FILE=$STAGING_ENV_FILE
fi
echo "getting environment variables from $ENV_FILE"
set -o allexport
source $ENV_FILE
set +o allexport

echo "publishing to $RELEASE_CHANNEL"
expo publish --release-channel $RELEASE_CHANNEL

echo "building ios and android apps concurrently"
expo build:ios --release-channel $RELEASE_CHANNEL --no-publish -t simulator &
expo build:android --release-channel $RELEASE_CHANNEL --no-publish -t apk &
wait

echo "downloading app packages"
curl -O "$(expo url:ipa)"
curl -O "$(expo url:apk)"

echo "opening on ios simulator"
tar -xf "$(basename $(expo url:ipa))"
xcrun simctl install booted ./wildlife-vehicle-collision-reporter.app
xcrun simctl launch booted gov.dts.ugrc.utahwvcr

echo "opening on android simulator"
adb install "$(basename $(expo url:apk))"
adb shell monkey -p gov.dts.ugrc.utahwvcr 1
