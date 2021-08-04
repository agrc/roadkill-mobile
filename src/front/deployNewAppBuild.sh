#!/usr/bin/env bash
set -e

if [ $1 ]; then
  RELEASE_CHANNEL=$1
elif [ -z "$GIT_BRANCH" ]; then
  GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD) || exit;
  RELEASE_CHANNEL=${GIT_BRANCH#"origin/"}
fi

ENV_FILE="./.env.$RELEASE_CHANNEL"
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

echo "*** don't forget to upload the android package to the Google Play Console"
