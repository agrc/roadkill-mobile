#!/usr/bin/env bash
set -e

. ./scripts/setChannel.sh

if [ -z "$1" ]; then
  PLATFORM="all"
else
  PLATFORM="$1"
fi

echo "Updating mile marker data..."
node ./scripts/updateMileMarkerData.mjs

echo "Building and deploying new app builds for release channel: $CHANNEL"

rm -rf ./dist

./scripts/removeArtifacts.sh $PLATFORM

echo "building $PLATFORM platform(s)"
eas build --platform $PLATFORM --profile $CHANNEL

./scripts/downloadArtifacts.sh $PLATFORM $CHANNEL $BRANCH

# apply environment variables from the .env file
# this is really just for the fastlane app specific password
if [ -f ./.env ]; then
  echo "Applying environment variables from .env file"
  export $(grep -v '^#' ./.env | xargs)
else
  echo ".env file not found, skipping environment variable application"
fi

if [ "$PLATFORM" == "all" ] || [ "$PLATFORM" == "ios" ]; then
  # TODO: switch to eas submit if DTS ever grants me access to the necessary app store/play store api's
  echo "uploading to testflight"
  fastlane pilot upload -u stdavis@applefeddev.utah.gov --notify_external_testers false
fi

if [ "$PLATFORM" == "all" ] || [ "$PLATFORM" == "android" ]; then
  echo "*** don't forget to upload the android package to the Google Play Console at https://play.google.com/console/u/0/developers/6377537875100906890/app/4972434106866476517/bundle-explorer"
fi

say "You're not going to believe this, but the build actually finished successfully!"
