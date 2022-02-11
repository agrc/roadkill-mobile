#!/usr/bin/env bash
set -e

echo "make sure that simulators are running..."
open -a simulator
emulator -avd $(emulator -list-avds) || true

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
xcrun simctl install booted ./WVCReporter.app
xcrun simctl launch booted gov.dts.ugrc.utahwvcr
rm -rf ./WVCReporter.app

echo "installing on android emulator"
adb install ./dev-clients/*.apk
adb shell monkey -p gov.dts.ugrc.utahwvcr 1

echo "building ios and android apps for local device development"
eas build --platform all --profile development --non-interactive

./scripts/downloadArtifacts.sh
