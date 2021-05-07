import git from 'git-rev-sync';

export default {
  name: 'Utah Wildlife-Vehicle Collision Reporter',
  slug: 'wildlife-vehicle-collision-reporter',
  description: 'A mobile application for reporting and removing animal carcasses.',
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
    buildNumber: git.count().toString(),
    supportsTablet: true,
  },
  android: {
    package: 'gov.dts.ugrc.utahwvcr',
    versionCode: git.count(),
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF',
    },
  },
};
