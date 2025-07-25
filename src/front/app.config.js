const commonConfig = require('common/config');
const dotenv = require('dotenv');

dotenv.config();

const bundleId = commonConfig.bundleIds[process.env.APP_VARIANT];
const names = {
  development: 'Utah Roadkill Dev',
  staging: 'Utah Roadkill Staging',
  production: 'Utah Roadkill',
};
const name = names[process.env.APP_VARIANT];

// perhaps this bump could be automated using a combo of app.config.json and this file?
const buildNumber = 662;

module.exports = {
  name,
  slug: 'wildlife-vehicle-collision-reporter', // changing this may result in new signing keys being generated (https://forums.expo.dev/t/changed-app-json-slug-and-android-build-keys-changed-can-i-get-them-back/9927/3)
  description:
    'A mobile application for reporting and removing roadkill in Utah.',
  owner: 'ugrc',
  scheme: bundleId,
  githubUrl: 'https://github.com/agrc/roadkill-mobile',
  version: '3.1.0',
  orientation: 'portrait',
  icon:
    process.env.APP_VARIANT === 'production'
      ? './assets/icon.png'
      : `./assets/icon_${process.env.APP_VARIANT}.png`,
  splash: {
    image:
      process.env.APP_VARIANT === 'production'
        ? './assets/splash.png'
        : `./assets/splash_${process.env.APP_VARIANT}.png`,
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
  },
  android: {
    package: bundleId,
    googleServicesFile: process.env.GOOGLE_SERVICES_ANDROID,
    versionCode: buildNumber,
    softwareKeyboardLayoutMode: 'pan',
    adaptiveIcon: {
      foregroundImage:
        process.env.APP_VARIANT === 'production'
          ? './assets/adaptive-icon.png'
          : `./assets/adaptive-icon_${process.env.APP_VARIANT}.png`,
      backgroundColor: '#FFFFFF',
    },
    permissions: [
      'ACCESS_BACKGROUND_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'FOREGROUND_SERVICE_LOCATION',
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
  plugins: [
    'expo-apple-authentication',
    [
      '@sentry/react-native/expo',
      {
        organization: 'utah-ugrc',
        project: 'roadkill',
        url: 'https://sentry.io',
      },
    ],
    'expo-notifications',
    [
      'expo-image-picker',
      {
        photosPermission:
          'The app accesses to your photos to allow you to submit a photo of the animal.',
        cameraPermission:
          'The app accesses your camera to allow you to capture and submit a photo of the animal.',
      },
    ],
    [
      'react-native-fbsdk-next',
      {
        appID: process.env.FACEBOOK_OAUTH_CLIENT_ID,
        clientToken: process.env.FACEBOOK_OAUTH_CLIENT_TOKEN,
        displayName: `${name} Reporter`,
        scheme: `fb${process.env.FACEBOOK_OAUTH_CLIENT_ID}`,
      },
    ],
    [
      'expo-build-properties',
      {
        ios: {
          useFrameworks: 'static',
        },
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          buildToolsVersion: '35.0.0',
        },
      },
    ],
    '@react-native-firebase/app',
    'expo-asset',
    'expo-localization',
    'expo-secure-store',
    [
      'expo-location',
      {
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        locationAlwaysAndWhenInUsePermission:
          'The app uses your location in the background for tracking routes. *Note* this is only applicable for agency employees or contractors. Background location is not used for public users.',
        locationWhenInUsePermission:
          'The app uses your location to help record the location of the animal that you are reporting.',
      },
    ],
  ],
  extra: {
    eas: {
      projectId: '648c99de-696c-4704-8723-7f8838dc6896',
    },
    APP_VARIANT: process.env.APP_VARIANT,
    GOOGLE_OAUTH_CLIENT_ID_ANDROID: process.env.GOOGLE_OAUTH_CLIENT_ID_ANDROID,
    GOOGLE_OAUTH_CLIENT_ID_IOS: process.env.GOOGLE_OAUTH_CLIENT_ID_IOS,
    API: process.env.API,
    CLIENT_ID: process.env.CLIENT_ID,
    APP_QUAD_WORD: process.env.APP_QUAD_WORD,
  },

  /* required for eas update command
    bump major version when upgrading expo version
  */
  runtimeVersion: '5.0.0',
  updates: {
    url: 'https://u.expo.dev/648c99de-696c-4704-8723-7f8838dc6896',
  },
};
