// This replaces `const { getDefaultConfig } = require('expo/metro-config');`
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const path = require('path');
const withStorybook = require('@storybook/react-native/metro/withStorybook');

const defaultConfig = getSentryExpoConfig(__dirname);

defaultConfig.resolver.assetExts.push('lazy');
defaultConfig.resolver.resolverMainFields.unshift('sbmodern');
defaultConfig.resolver.sourceExts.push('mjs');
defaultConfig.transformer.unstable_allowRequireContext = true; // required for storybook

module.exports = withStorybook(defaultConfig, {
  enabled: true,
  configPath: path.resolve(__dirname, './.storybook'),
});
