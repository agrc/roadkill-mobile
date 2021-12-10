import 'dotenv/config';

const bundleId = 'gov.dts.ugrc.utahwvcr';

const buildNumber = 521;

export default {
  name: 'WVC Reporter',
  slug: 'wildlife-vehicle-collision-reporter',
  description: 'A mobile application for reporting and removing animal carcasses.',
  // this needs to be different from the bundleId, otherwise android presents two options for redirect
  // Ref: https://forums.expo.dev/t/app-appears-twice-on-open-with-list-after-google-auth/55659/6?u=agrc
  scheme: bundleId.split('.').pop(),
  facebookScheme: `fb${process.env.FACEBOOK_OAUTH_CLIENT_ID}`,
  facebookAppId: process.env.FACEBOOK_OAUTH_CLIENT_ID,
  facebookDisplayName: 'Utah WVC Reporter',
  githubUrl: 'https://github.com/agrc/roadkill-mobile',
  version: '3.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  updates: {
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ['**/*'],
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
    },
  },
  android: {
    package: bundleId,
    googleServicesFile: process.env.GOOGLE_SERVICES_ANDROID,
    versionCode: buildNumber,
    softwareKeyboardLayoutMode: 'pan',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF',
    },
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'FOREGROUND_SERVICE',
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
    ],
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID,
      },
    },
  },
  // this is only to enable logEvent calls during development in Expo Go
  // ref: https://docs.expo.io/versions/latest/sdk/firebase-analytics/#expo-go-limitations--configuration
  web: {
    config: {
      firebase: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID ?? '',
        measurementId: process.env.FIREBASE_MEASUREMENT_ID ?? 'G-XXXXXXXXXX',
      },
    },
  },
  hooks: {
    postPublish: [
      {
        file: 'sentry-expo/upload-sourcemaps',
        config: {
          organization: 'utah-agrc',
          project: 'roadkill',
          authToken: process.env.SENTRY_AUTH_TOKEN,
        },
      },
    ],
  },
  plugins: ['sentry-expo', 'expo-community-flipper'],
};
