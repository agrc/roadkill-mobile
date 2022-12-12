#!/usr/bin/env bash
set -e

RELEASE_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "Publishing new app builds for release channel: $RELEASE_BRANCH"

ENV_FILE="./.env.$RELEASE_BRANCH"
echo "getting environment variables from $ENV_FILE"

rm -rf ./dist

echo "publishing OTA update"
results=$(npx env-cmd -f $ENV_FILE eas update --auto --json --non-interactive)

echo "renaming files for sentry sourcemap upload"
mv $(find ./dist/bundles/android-*.js) dist/bundles/index.android.bundle.js
mv $(find ./dist/bundles/ios-*.js) dist/bundles/main.jsbundle.js

config=$(eas config -p android -e $RELEASE_BRANCH | sed -n '/^{/,/^}/p' | jq -s '.[0]')

bundle_id=$(echo $config | jq -r '.android .package')
version=$(echo $config | jq -r '.version')
build=$(echo $config | jq -r '.ios .buildNumber')

if [[ $(echo $results | jq -r '.[0] .platform') == 'android' ]]; then
  android_results=$(echo $results | jq '.[0]')
  ios_results=$(echo $results | jq '.[1]')
else
  ios_results=$(echo $results | jq '.[0]')
  android_results=$(echo $results | jq '.[1]')
fi

echo "uploading android sourcemaps to sentry"
npx sentry-cli releases \
  files $bundle_id@$version+$build \
  upload-sourcemaps \
  --dist $(echo $android_results | jq -r '.id') \
  --rewrite dist/bundles/index.android.bundle.js $(find ./dist/bundles/android-*.map) \
  --org utah-ugrc \
  --project roadkill

echo "uploading ios sourcemaps to sentry"
npx sentry-cli releases \
  files $bundle_id@$version+$build \
  upload-sourcemaps \
  --dist $(echo $ios_results | jq -r '.id') \
  --rewrite dist/bundles/main.jsbundle.js $(find ./dist/bundles/ios-*.map) \
  --org utah-ugrc \
  --project roadkill

say "over-the-air update published successfully"
