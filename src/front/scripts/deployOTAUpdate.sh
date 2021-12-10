#!/usr/bin/env bash
set -e

RELEASE_CHANNEL=$(./scripts/getReleaseChannel.sh)
echo "Publishing new app builds for release channel: $RELEASE_CHANNEL"

RELEASE_BRANCH=$(git rev-parse --abbrev-ref HEAD)
ENV_FILE="./.env.$RELEASE_BRANCH"
echo "getting environment variables from $ENV_FILE"
set -o allexport
source $ENV_FILE
set +o allexport

./scripts/removeArtifacts.sh

expo publish --release-channel $RELEASE_CHANNEL
