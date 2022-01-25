#!/usr/bin/env bash
set -e

echo "downloading android..."
ANDROID_URL=$(eas build:list --platform android --json --limit 1 | jq -r '.[0].artifacts.buildUrl')
curl -LO $ANDROID_URL

echo "downloading ios..."
IOS_URL=$(eas build:list --platform ios --json --limit 1 | jq -r '.[0].artifacts.buildUrl')
curl -LO $IOS_URL
