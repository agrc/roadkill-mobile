#!/usr/bin/env bash
set -e

echo "remember to make sure that simulators are running..."

./scripts/removeArtifacts.sh

echo "building ios and android apps for simulator development"
eas build --platform all --profile simulator-dev --non-interactive

./scripts/downloadArtifacts.sh

echo "updating files in dev-clients folder"
rm -f -- ./dev-clients/*.gz
cp *.gz ./dev-clients
rm -f -- ./dev-clients/*.apk
cp *.apk ./dev-clients

echo "installing on ios simulator"
tar -xf ./dev-clients/*.gz
xcrun simctl install booted ./WVCDev.app
xcrun simctl launch booted gov.dts.ugrc.utahwvcr.dev
rm -rf ./WVCDev.app

echo "installing on android emulator"
adb install ./dev-clients/*.apk
adb shell monkey -p gov.dts.ugrc.utahwvcr.dev 1

echo "building ios and android apps for local device development"
eas build --platform all --profile development --non-interactive

echo "open the previously printed URLs on your development devices to install the new builds"
