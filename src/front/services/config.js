import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

let API = Constants.expoConfig.extra.API;
if (__DEV__ && !process.env.JEST_WORKER_ID) {
  if (!Device.isDevice && Platform.OS === 'android') {
    // API = API.replace('localhost', '10.0.3.2'); // genymotion emulator
    API = API.replace('localhost', '10.0.2.2'); // android studio emulator
  } else if (Device.isDevice) {
    API = API.replace('localhost', Constants.manifest2.extra.expoClient.hostUri.split(':').shift());
  }
}

export default {
  CLIENT_ID: Constants.expoConfig.extra.CLIENT_ID,
  API,
  USER_TYPES: {
    public: 'reporter',
    contractor: 'contractor',
    agency: 'agency',
    admin: 'admin',
  },
  // if user is already registered, then they will be sent to the main navigator
  // don't redirect to new-user because we don't want registered users to see that screen
  OAUTH_REDIRECT_SCREEN: 'choose-type',
  USER_STORE_KEY: 'USER_INFO',
  USER_TYPE_KEY: 'USER_TYPE',
  URLS: {
    HYBRID: `https://discover.agrc.utah.gov/login/path/${Constants.expoConfig.extra.APP_QUAD_WORD}/tiles/hybrid_basemap/{z}/{x}/{y}.jpg`,
    PSAP_FEATURE_SERVICE:
      'https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/UtahPSAP_Boundaries/FeatureServer/0',
  },
  SUPPORT_EMAIL: 'utah-roadkill-reporter-notify@utah.gov',
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
  API_REQUEST_TIMEOUT: 1000 * 300, // 5 minutes - matches GCP cloud run timeout
  MAX_TRACKING_TIME: 1000 * 60 * 60 * 12, // 12 hours
  REPORT_TYPES: {
    report: 'report',
    pickup: 'pickup',
  },
  MIN_TRACKING_VERTEX_DISTANCE: 15, // meters
};
