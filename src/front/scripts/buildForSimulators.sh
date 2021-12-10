#!/usr/bin/env bash
# build apps for simulators for testing before submitting to app stores
set -e

echo "Building simulator builds"

echo "building ios and android apps for simulator development"
eas build --platform all --profile simulator-dev

./downloadArtifacts.sh

echo "opening on ios simulator"
tar -xf "$(basename $IOS_URL)"
xcrun simctl install booted ./wildlife-vehicle-collision-reporter.app
xcrun simctl launch booted gov.dts.ugrc.utahwvcr

echo "opening on android simulator"
adb install "$(basename $ANDROID_URL)"
adb shell monkey -p gov.dts.ugrc.utahwvcr 1

echo "building ios and android apps for local device development"
eas build --platform all --profile development

./downloadArtifacts.sh
