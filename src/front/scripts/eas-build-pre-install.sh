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

if [[ $EAS_BUILD_PROFILE != "production" ]]; then
  echo "building google services files for non-production"

  echo $STAGING_GOOGLE_SERVICES_ANDROID_BASE64 | base64 -d > ./google-services.json
  echo $STAGING_GOOGLE_SERVICES_IOS_BASE64 | base64 -d > ./GoogleService-Info.plist
  export GOOGLE_MAPS_API_KEY_ANDROID="$STAGING_GOOGLE_MAPS_API_KEY_ANDROID"
  export GOOGLE_MAPS_API_KEY_IOS="$STAGING_GOOGLE_MAPS_API_KEY_IOS"
else
  echo "building google services files for production"

  echo $PRODUCTION_GOOGLE_SERVICES_ANDROID_BASE64 | base64 -d > ./google-services.json
  echo $PRODUCTION_GOOGLE_SERVICES_IOS_BASE64 | base64 -d > ./GoogleService-Info.plist
  export GOOGLE_MAPS_API_KEY_ANDROID="$PRODUCTION_GOOGLE_MAPS_API_KEY_ANDROID"
  export GOOGLE_MAPS_API_KEY_IOS="$PRODUCTION_GOOGLE_MAPS_API_KEY_IOS"
fi

echo "exporting env vars required at runtime to .env file"
echo "API=$API" >> .env
echo "CLIENT_ID=$CLIENT_ID" >> .env
echo "FACEBOOK_OAUTH_CLIENT_ID=$FACEBOOK_OAUTH_CLIENT_ID" >> .env
echo "GOOGLE_OAUTH_CLIENT_ID_IOS=$GOOGLE_OAUTH_CLIENT_ID_IOS" >> .env
echo "GOOGLE_OAUTH_CLIENT_ID_ANDROID=$GOOGLE_OAUTH_CLIENT_ID_ANDROID" >> .env
echo "GOOGLE_OAUTH_CLIENT_ID_EXPO_GO=$GOOGLE_OAUTH_CLIENT_ID_EXPO_GO" >> .env