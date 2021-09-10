#!/usr/bin/env bash
# get the approviate release channel based on the current git branch and app version

GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
VERSION=$(sed -nr "s/.*version: '(.).*/v\1/p" app.config.js)
ENVIRONMENT=$GIT_BRANCH
if [[ $GIT_BRANCH != "production" && $GIT_BRANCH != "staging" ]]; then
  ENVIRONMENT="dev"
fi

RELEASE_CHANNEL="$ENVIRONMENT-$VERSION"

echo $RELEASE_CHANNEL
