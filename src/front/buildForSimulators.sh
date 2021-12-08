#!/usr/bin/env bash
# build apps for simulators for testing before submitting to app stores
set -e

echo "Building simulator builds"

echo "building ios and android apps concurrently"
eas build --platform all --profile simulators

echo "downloading artifacts"
ANDROID_URL = eas build:list --platform android --json --limit 1 | jq '.[0].artifacts.buildUrl'
curl -LO $ANDROID_URL
IOS_URL = eas build:list --platform ios --json --limit 1 | jq '.[0].artifacts.buildUrl'
curl -LO $IOS_URL

echo "opening on ios simulator"
tar -xf "$(basename $IOS_URL)"
xcrun simctl install booted ./wildlife-vehicle-collision-reporter.app
xcrun simctl launch booted gov.dts.ugrc.utahwvcr

echo "opening on android simulator"
adb install "$(basename $ANDROID_URL)"
adb shell monkey -p gov.dts.ugrc.utahwvcr 1
