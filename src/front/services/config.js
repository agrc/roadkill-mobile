import Constants from 'expo-constants';
import * as Device from 'expo-device';

let API = process.env.API;
if (__DEV__ && !process.env.JEST_WORKER_ID) {
  if (!Device.isDevice && Constants.platform.android) {
    // API = API.replace('localhost', '10.0.3.2'); // genymotion emulator
    API = API.replace('localhost', '10.0.2.2'); // android studio emulator
  } else if (Device.isDevice) {
    API = API.replace('localhost', Constants.manifest.debuggerHost.split(':').shift());
  }
}

export default {
  CLIENT_ID: process.env.CLIENT_ID,
  API,
  SCHEME: !process.env.JEST_WORKER_ID ? Constants.manifest.scheme : 'test_scheme',
  USER_TYPES: {
    public: 'reporter',
    contractor: 'contractor',
    agency: 'agency',
    admin: 'admin',
  },
  PROVIDER_NAMES: {
    google: 'google',
    facebook: 'facebook',
    utahid: 'utahid',
  },
  // if user is already registered, then they will be sent to the main navigator
  // don't redirect to new-user because we don't want registered users to see that screen
  OAUTH_REDIRECT_SCREEN: 'choose-type',
  USER_STORE_KEY: 'USER_INFO',
  USER_TYPE_KEY: 'USER_TYPE',
  URLS: {
    LITE: `https://discover.agrc.utah.gov/login/path/${process.env.APP_QUAD_WORD}/tiles/lite_basemap/{z}/{x}/{y}.jpg`,
    PSAP_FEATURE_SERVICE:
      'https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/UtahPSAP_Boundaries/FeatureServer/0',
  },
  SUPPORT_EMAIL: 'wvc-dnr-dwr-notify@utah.gov',
  RELEASE_BRANCHES: {
    production: 'production',
    staging: 'staging',
    dev: 'dev',
  },
  SPINNER_DELAY: 250,
  MAX_ZOOM_LEVEL: 18, // google maps
  MIN_ALTITUDE: 650, // apple maps
  IMAGE_COMPRESSION_QUALITY: 0.1, // 1 is max quality
  SHOW_STORYBOOK: __DEV__ && !process.env.JEST_WORKER_ID && !global.__REMOTEDEV__,
  UNKNOWN: 'unknown',
  QUERY_KEYS: {
    submissions: 'submissions',
    profile: 'profile',
  },
  API_REQUEST_TIMEOUT: 1000 * 60 * 5, // 5 minutes (this is the default timeout for cloud run)
  MAX_TRACKING_TIME: 1000 * 60 * 60 * 12, // 12 hours
  REPORT_TYPES: {
    report: 'report',
    pickup: 'pickup',
  },
};
