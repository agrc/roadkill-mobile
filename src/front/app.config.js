import commonConfig from 'common/config';
import * as dotenv from 'dotenv';

dotenv.config();

const bundleId = commonConfig.bundleIds[process.env.ENVIRONMENT];
const names = {
  development: 'Utah Roadkill Dev',
  staging: 'Utah Roadkill Staging',
  production: 'Utah Roadkill',
};
const name = names[process.env.ENVIRONMENT];

// perhaps this bump could be automated using a combo of app.config.json and this file?
const buildNumber = 583;

export default {
  name,
  slug: 'wildlife-vehicle-collision-reporter', // changing this may result in new signing keys being generated (https://forums.expo.dev/t/changed-app-json-slug-and-android-build-keys-changed-can-i-get-them-back/9927/3)
  description: 'A mobile application for reporting and removing roadkill in Utah.',
  scheme: bundleId,
  githubUrl: 'https://github.com/agrc/roadkill-mobile',
  version: '3.0.1',
  orientation: 'portrait',
  icon: process.env.ENVIRONMENT === 'production' ? './assets/icon.png' : `./assets/icon_${process.env.ENVIRONMENT}.png`,
  splash: {
    image:
      process.env.ENVIRONMENT === 'production'
        ? './assets/splash.png'
        : `./assets/splash_${process.env.ENVIRONMENT}.png`,
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*'],
  jsEngine: 'hermes',
  ios: {
    bundleIdentifier: bundleId,
    googleServicesFile: process.env.GOOGLE_SERVICES_IOS,
    buildNumber: buildNumber.toString(),
    supportsTablet: true,
    config: {
      usesNonExemptEncryption: false,
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_IOS,
    },
    infoPlist: {
      NSLocationAlwaysUsageDescription:
        'The app uses your location in the background for tracking routes. *Note* this is only applicable for agency employees or contractors. Background location is not used for public users.',
      NSLocationWhenInUseUsageDescription:
        'The app uses your location to help record the location of the animal that you are reporting.',
      UIBackgroundModes: ['location'],
    },
  },
  android: {
    package: bundleId,
    googleServicesFile: process.env.GOOGLE_SERVICES_ANDROID,
    versionCode: buildNumber,
    softwareKeyboardLayoutMode: 'pan',
    adaptiveIcon: {
      foregroundImage:
        process.env.ENVIRONMENT === 'production'
          ? './assets/adaptive-icon.png'
          : `./assets/adaptive-icon_${process.env.ENVIRONMENT}.png`,
      backgroundColor: '#FFFFFF',
    },
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
    ],
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID,
      },
    },
  },
  hooks: {
    postPublish: [
      {
        file: 'sentry-expo/upload-sourcemaps',
        config: {
          organization: 'utah-ugrc',
          project: 'roadkill',
          authToken: process.env.SENTRY_AUTH_TOKEN,
        },
      },
    ],
  },
  plugins: [
    'expo-apple-authentication',
    'sentry-expo',
    'expo-notifications',
    [
      'expo-image-picker',
      {
        photosPermission: 'The app accesses to your photos to allow you to submit a photo of the animal.',
        cameraPermission: 'The app accesses your camera to allow you to capture and submit a photo of the animal.',
      },
    ],
    [
      'react-native-fbsdk-next',
      {
        appID: process.env.FACEBOOK_OAUTH_CLIENT_ID,
        clientToken: process.env.FACEBOOK_OAUTH_CLIENT_TOKEN,
        displayName: `${name} Reporter`,
        advertiserIDCollectionEnabled: false,
        autoLogAppEventsEnabled: false,
      },
    ],
    './withReactNativeMaps',
    [
      'expo-build-properties',
      {
        ios: {
          useFrameworks: 'static',
        },
      },
    ],
  ],
  extra: {
    eas: {
      projectId: '648c99de-696c-4704-8723-7f8838dc6896',
    },
    ENVIRONMENT: process.env.ENVIRONMENT,
    GOOGLE_OAUTH_CLIENT_ID_ANDROID: process.env.GOOGLE_OAUTH_CLIENT_ID_ANDROID,
    GOOGLE_OAUTH_CLIENT_ID_IOS: process.env.GOOGLE_OAUTH_CLIENT_ID_IOS,
    API: process.env.API,
    CLIENT_ID: process.env.CLIENT_ID,
    APP_QUAD_WORD: process.env.APP_QUAD_WORD,
  },

  // required for eas update command
  runtimeVersion: '1.0.1',
  updates: {
    url: 'https://u.expo.dev/648c99de-696c-4704-8723-7f8838dc6896',
  },
};
