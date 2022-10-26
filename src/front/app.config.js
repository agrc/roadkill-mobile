import * as dotenv from 'dotenv';
dotenv.config();

const baseBundleId = 'gov.dts.ugrc.utahwvcr';
const bundleIds = {
  development: `${baseBundleId}.dev`,
  staging: `${baseBundleId}.staging`,
  production: baseBundleId,
};
const bundleId = bundleIds[process.env.ENVIRONMENT];
const names = {
  development: 'WVC (Dev)',
  staging: 'WVC (Staging)',
  production: 'WVC Reporter',
};
const name = names[process.env.ENVIRONMENT];

const buildNumber = 555;

export default {
  name,
  slug: 'wildlife-vehicle-collision-reporter',
  description: 'A mobile application for reporting and removing animal carcasses.',
  scheme: bundleId,
  githubUrl: 'https://github.com/agrc/roadkill-mobile',
  version: '3.0.0',
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
        displayName: `Utah ${name}`,
        advertiserIDCollectionEnabled: false,
        autoLogAppEventsEnabled: false,
      },
    ],
    [
      'expo-build-properties',
      {
        ios: {
          // required for react-native-maps, expo default for sdk 46 is 12.0
          // ref: https://github.com/react-native-maps/react-native-maps/blob/master/docs/installation.md#enabling-google-maps
          deploymentTarget: '13.0',

          // this will be needed when expo-firebase-analytics and react-native-maps are bumped
          // it fixes firebase but breaks maps
          // waiting on https://github.com/react-native-maps/react-native-maps/discussions/4389
          // // https://docs.expo.dev/versions/latest/sdk/firebase-analytics/#additional-configuration-for-ios
          // useFrameworks: 'static',
        },
      },
    ],
  ],
  extra: {
    eas: {
      projectId: '648c99de-696c-4704-8723-7f8838dc6896',
    },
  },

  // required for eas update command
  runtimeVersion: '1.0.0',
  updates: {
    url: 'https://u.expo.dev/648c99de-696c-4704-8723-7f8838dc6896',
  },
};
