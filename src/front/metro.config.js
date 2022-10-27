// https://dushyant37.medium.com/how-to-import-files-from-outside-of-root-directory-with-react-native-metro-bundler-18207a348427
const { getDefaultConfig } = require('expo/metro-config');
const defaultConfig = getDefaultConfig(__dirname);

const path = require('path');
const commonDir = path.resolve(__dirname + '/../common');

defaultConfig.resolver.extraNodeModules.common = commonDir;
defaultConfig.watchFolders.push(commonDir);
defaultConfig.resolver.assetExts.push('lazy');

module.exports = defaultConfig;
