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

echo "publishing to $RELEASE_CHANNEL"
expo publish --release-channel $RELEASE_CHANNEL

echo "building ios and android apps concurrently"
expo build:ios --release-channel $RELEASE_CHANNEL --no-publish -t archive &
expo build:android --release-channel $RELEASE_CHANNEL --no-publish -t app-bundle &
wait

echo "downloading app packages"
curl -O "$(expo url:ipa)"
curl -O "$(expo url:apk)"

echo "uploading to testflight"
fastlane pilot upload -u stdavis@utah.gov

echo "*** don't forget to upload the android package to the Google Play Console at https://play.google.com/console/u/1/developers/6377537875100906890/app/4972434106866476517/bundle-explorer"
