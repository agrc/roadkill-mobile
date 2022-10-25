#!/usr/bin/env bash
set -e

RELEASE_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Publishing new app builds for release branch: $RELEASE_BRANCH"

ENV_FILE="./.env.$RELEASE_BRANCH"
echo "getting environment variables from $ENV_FILE"
set -o allexport
source $ENV_FILE
set +o allexport

eas update --branch $RELEASE_BRANCH
