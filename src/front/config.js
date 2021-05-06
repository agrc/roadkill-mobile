import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import devConfig from './env.dev';
import stagingConfig from './env.staging';
import prodConfig from './env.prod';

let env;
if (Updates.releaseChannel.startsWith('prod')) {
  env = prodConfig;
} else if (Updates.releaseChannel.startsWith('staging')) {
  env = stagingConfig;
} else {
  env = devConfig;
}

let API = env.API;
// localhost/10.0.2.2 only work for emulators running on the same machine as the dev server
// how to handle separate devices? ngrok? localtunnel? deploy to gcp dev?
if (__DEV__ && Platform.OS === 'android') {
  API = API.replace('localhost', '10.0.2.2');
}

export default { CLIENT_ID: env.CLIENT_ID, API, SCHEME: Constants.manifest.scheme };
