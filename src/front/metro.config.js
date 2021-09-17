// https://dushyant37.medium.com/how-to-import-files-from-outside-of-root-directory-with-react-native-metro-bundler-18207a348427
const path = require('path');
const extraNodeModules = {
  common: path.resolve(__dirname + '/../common'),
};
const watchFolders = [path.resolve(__dirname + '/../common')];
module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: false,
      },
    }),
  },
  resolver: {
    extraNodeModules,
  },
  watchFolders,
};
