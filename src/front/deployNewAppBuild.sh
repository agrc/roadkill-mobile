#!/usr/bin/env bash
set -e

RELEASE_CHANNEL=$(./getReleaseChannel.sh)
echo "Building and deploying new app builds for release channel: $RELEASE_CHANNEL"

RELEASE_BRANCH=$(git rev-parse --abbrev-ref HEAD)
ENV_FILE="./.env.$RELEASE_BRANCH"
echo "getting environment variables from $ENV_FILE"
set -o allexport
source $ENV_FILE
set +o allexport

echo "building ios and android apps concurrently"
eas build --platform all --profile $RELEASE_CHANNEL

# TODO: switch to eas submit if DTS ever grants me access to the necessary app store/play store api's
echo "downloading artifacts"
ANDROID_URL = eas build:list --platform android --json --limit 1 | jq '.[0].artifacts.buildUrl'
curl -LO $ANDROID_URL
IOS_URL = eas build:list --platform ios --json --limit 1 | jq '.[0].artifacts.buildUrl'
curl -LO $IOS_URL

echo "uploading to testflight"
fastlane pilot upload -u stdavis@utah.gov

echo "*** don't forget to upload the android package to the Google Play Console at https://play.google.com/console/u/1/developers/6377537875100906890/app/4972434106866476517/bundle-explorer"
