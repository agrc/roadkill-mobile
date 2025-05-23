#!/usr/bin/env bash
set -e

echo "remember to make sure that simulators are running..."

./scripts/removeArtifacts.sh

echo "building ios and android apps for simulator development"
eas build --platform all --profile simulator-dev --non-interactive

./scripts/downloadArtifacts.sh all simulator-dev default

echo "updating files in dev-clients folder"
rm -f -- ./dev-clients/*.gz
cp *.gz ./dev-clients
rm -f -- ./dev-clients/*.apk
cp *.apk ./dev-clients

echo "installing on ios simulator"
tar -xf ./dev-clients/*.gz
xcrun simctl install booted ./UtahRoadkillDev.app
xcrun simctl launch booted gov.dts.ugrc.utahwvcr.dev
rm -rf ./UtahRoadkillDev.app

echo "installing on android emulator"
adb install ./dev-clients/*.apk
adb shell monkey -p gov.dts.ugrc.utahwvcr.dev 1

read -p "Do you want to run builds for local device development as well? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
  exit 1
fi

echo "building ios and android apps for local device development"
eas build --platform all --profile development --non-interactive

echo "open the previously printed URLs on your development devices to install the new builds"

say "You're not going to believe this, but the build actually finished successfully!"
