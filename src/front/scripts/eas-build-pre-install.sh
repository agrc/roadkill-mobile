#!/usr/bin/env bash
set -e

echo "EAS build pre-install script for profile: $EAS_BUILD_PROFILE"

if [[ $EAS_BUILD_PROFILE == "staging" ]]; then
  export CLIENT_ID="$STAGING_CLIENT_ID"
  export API="$STAGING_API"
  export FIREBASE_MEASUREMENT_ID="$STAGING_FIREBASE_MEASUREMENT_ID"
fi

if [[ $EAS_BUILD_PROFILE == "production" ]]; then
  export CLIENT_ID="$PRODUCTION_CLIENT_ID"
  export API="$PRODUCTION_API"
  export FIREBASE_MEASUREMENT_ID="$PRODUCTION_FIREBASE_MEASUREMENT_ID"
fi

if [[ $EAS_BUILD_PROFILE == "production" ]]; then
  echo "building google services files for production"

  echo $PRODUCTION_GOOGLE_SERVICES_ANDROID_BASE64 | base64 -d > ./google-services.json
  echo $PRODUCTION_GOOGLE_SERVICES_IOS_BASE64 | base64 -d > ./GoogleService-Info.plist
  export GOOGLE_MAPS_API_KEY_ANDROID="$PRODUCTION_GOOGLE_MAPS_API_KEY_ANDROID"
  export GOOGLE_MAPS_API_KEY_IOS="$PRODUCTION_GOOGLE_MAPS_API_KEY_IOS"
  export GOOGLE_OAUTH_CLIENT_ID_ANDROID="$PRODUCTION_GOOGLE_OAUTH_CLIENT_ID_ANDROID"
  export GOOGLE_OAUTH_CLIENT_ID_IOS="$PRODUCTION_GOOGLE_OAUTH_CLIENT_ID_IOS"
elif [[ $EAS_BUILD_PROFILE == "staging" ]]; then
  echo "building google services files for staging"

  echo $STAGING_GOOGLE_SERVICES_ANDROID_BASE64 | base64 -d > ./google-services.json
  echo $STAGING_GOOGLE_SERVICES_IOS_BASE64 | base64 -d > ./GoogleService-Info.plist
  export GOOGLE_MAPS_API_KEY_ANDROID="$STAGING_GOOGLE_MAPS_API_KEY_ANDROID"
  export GOOGLE_MAPS_API_KEY_IOS="$STAGING_GOOGLE_MAPS_API_KEY_IOS"
  export GOOGLE_OAUTH_CLIENT_ID_ANDROID="$STAGING_GOOGLE_OAUTH_CLIENT_ID_ANDROID"
  export GOOGLE_OAUTH_CLIENT_ID_IOS="$STAGING_GOOGLE_OAUTH_CLIENT_ID_IOS"
else
  echo "building google services files for development"

  echo $DEV_GOOGLE_SERVICES_ANDROID_BASE64 | base64 -d > ./google-services.json
  echo $DEV_GOOGLE_SERVICES_IOS_BASE64 | base64 -d > ./GoogleService-Info.plist
  #: staging map api keys are restricted to both staging and dev apps...
  export GOOGLE_MAPS_API_KEY_ANDROID="$STAGING_GOOGLE_MAPS_API_KEY_ANDROID"
  export GOOGLE_MAPS_API_KEY_IOS="$STAGING_GOOGLE_MAPS_API_KEY_IOS"
  export GOOGLE_OAUTH_CLIENT_ID_ANDROID="$DEV_GOOGLE_OAUTH_CLIENT_ID_ANDROID"
  export GOOGLE_OAUTH_CLIENT_ID_IOS="$DEV_GOOGLE_OAUTH_CLIENT_ID_IOS"
fi

echo "exporting env vars required at runtime to .env file"
rm -f .env
echo "API=$API" >> .env
echo "CLIENT_ID=$CLIENT_ID" >> .env
echo "FACEBOOK_OAUTH_CLIENT_ID=$FACEBOOK_OAUTH_CLIENT_ID" >> .env
echo "FACEBOOK_OAUTH_CLIENT_TOKEN=$FACEBOOK_OAUTH_CLIENT_TOKEN" >> .env
echo "GOOGLE_OAUTH_CLIENT_ID_IOS=$GOOGLE_OAUTH_CLIENT_ID_IOS" >> .env
echo "GOOGLE_OAUTH_CLIENT_ID_ANDROID=$GOOGLE_OAUTH_CLIENT_ID_ANDROID" >> .env
echo "APP_QUAD_WORD=$APP_QUAD_WORD" >> .env

echo "installing npm deps for the common package"
cd ../common
npm i
