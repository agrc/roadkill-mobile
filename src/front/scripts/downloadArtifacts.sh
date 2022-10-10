#!/usr/bin/env bash
set -e

if [ -z "$1" ]; then
  PLATFORM="all"
else
  PLATFORM="$1"
fi

if [ "$PLATFORM" == "all" ] || [ "$PLATFORM" == "android" ]; then
  ANDROID_URL=$(eas build:list --platform android --json --non-interactive --limit 1 | jq -r '.[0].artifacts.buildUrl')
  echo "downloading android...$ANDROID_URL"
  curl -LO $ANDROID_URL
fi

if [ "$PLATFORM" == "all" ] || [ "$PLATFORM" == "ios" ]; then
  IOS_URL=$(eas build:list --platform ios --json --non-interactive --limit 1 | jq -r '.[0].artifacts.buildUrl')
  echo "downloading ios...$IOS_URL"
  curl -LO $IOS_URL
fi
