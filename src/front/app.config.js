import 'dotenv/config';
import fs from 'fs';
import git from 'git-rev-sync';

const bundleId = 'gov.dts.ugrc.utahwvcr';

const googleServicesContent = fs.readFileSync(`./${process.env.GOOGLE_SERVICES_ANDROID}`);
const googleServicesJson = JSON.parse(googleServicesContent);

export default {
  name: 'Utah Wildlife-Vehicle Collision Reporter',
  slug: 'wildlife-vehicle-collision-reporter',
  description: 'A mobile application for reporting and removing animal carcasses.',
  scheme: bundleId,
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
    googleServicesFile: `./${process.env.GOOGLE_SERVICES_IOS}`,
    buildNumber: git.count().toString(),
    supportsTablet: true,
  },
  android: {
    package: bundleId,
    googleServicesFile: `./${process.env.GOOGLE_SERVICES_ANDROID}`,
    versionCode: git.count(),
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF',
    },
  },
  // this is only to enable logEvent calls during development in Expo Go
  // ref: https://docs.expo.io/versions/latest/sdk/firebase-analytics/#expo-go-limitations--configuration
  web: {
    config: {
      firebase: {
        apiKey: googleServicesJson.client[0].api_key[0].current_key,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-XXXXXXXXXX',
      },
    },
  },
};
