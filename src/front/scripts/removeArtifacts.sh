#!/usr/bin/env bash
set -e

if [ -z "$1" ]; then
  PLATFORM="all"
else
  PLATFORM="$1"
fi

echo "cleaning up old artifacts"
if [ "$PLATFORM" == "all" or "$PLATFORM" == "ios" ]; then
  rm -f -- *.gz
  rm -f -- *.ipa
fi

if [ "$PLATFORM" == "all" or "$PLATFORM" == "android" ]; then
  rm -f -- *.apk
  rm -f -- *.aab
fi
