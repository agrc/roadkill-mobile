export default {
  name: 'Utah Wildlife-Vehicle Collision Reporter',
  slug: 'wildlife-vehicle-collision-reporter',
  scheme: 'wvcr',
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
    bundleIdentifier: 'gov.dts.ugrc.utahwvcr',
    buildNumber: '0',
    supportsTablet: true,
  },
  android: {
    package: 'gov.dts.ugrc.utahwvcr',
    versionCode: 0,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF',
    },
  },
};
