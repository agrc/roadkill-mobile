// https://dushyant37.medium.com/how-to-import-files-from-outside-of-root-directory-with-react-native-metro-bundler-18207a348427
// This replaces `const { getDefaultConfig } = require('expo/metro-config');`
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const path = require('path');
const commonDir = path.resolve(__dirname + '/../common');
const { generate } = require('@storybook/react-native/scripts/generate');

generate({
  configPath: path.resolve(__dirname, './.storybook'),
});

const defaultConfig = getSentryExpoConfig(__dirname);

defaultConfig.resolver.extraNodeModules.common = commonDir;
defaultConfig.watchFolders.push(commonDir);
defaultConfig.resolver.assetExts.push('lazy');
defaultConfig.resolver.resolverMainFields.unshift('sbmodern');
defaultConfig.resolver.sourceExts.push('mjs');
defaultConfig.transformer.unstable_allowRequireContext = true; // required for storybook

module.exports = defaultConfig;
