#!/usr/bin/env bash
set -e

if [ -z "$1" ]; then
  PLATFORM="all"
else
  PLATFORM="$1"
fi

if [ "$PLATFORM" == "all" or "$PLATFORM" == "android" ]; then
  echo "downloading android..."
  ANDROID_URL=$(eas build:list --platform android --json --limit 1 | jq -r '.[0].artifacts.buildUrl')
  curl -LO $ANDROID_URL
fi

if [ "$PLATFORM" == "all" or "$PLATFORM" == "ios" ]; then
  echo "downloading ios..."
  IOS_URL=$(eas build:list --platform ios --json --limit 1 | jq -r '.[0].artifacts.buildUrl')
  curl -LO $IOS_URL
fi
