import Constants from 'expo-constants';

let API = process.env.API;
// localhost/10.0.2.2 only work for emulators running on the same machine as the dev server
// how to handle separate devices? ngrok? localtunnel? deploy to gcp dev?
if (__DEV__ && !process.env.JEST_WORKER_ID) {
  if (!Constants.isDevice && Constants.platform.android) {
    // API = API.replace('localhost', '10.0.3.2'); // genymotion emulator
    API = API.replace('localhost', '10.0.2.2'); // android studio emulator
  } else if (Constants.isDevice) {
    API = API.replace('localhost', Constants.manifest.debuggerHost.split(':').shift());
  }
}

export default {
  CLIENT_ID: process.env.CLIENT_ID,
  API,
  SCHEME: Constants.manifest.scheme,
  USER_TYPES: {
    public: 'reporter',
    contractor: 'contractor',
    agencyEmployee: 'agency',
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
    LITE: 'https://discover.agrc.utah.gov/login/path/alabama-anvil-picnic-sunset/tiles/lite_basemap/{z}/{x}/{y}.jpg',
  },
  SUPPORT_EMAIL: 'wvc-dnr-dwr-notify@utah.gov',
  RELEASE_BRANCHES: {
    production: 'production',
    staging: 'staging',
    dev: 'dev',
  },
  SPINNER_DELAY: 250,
  LIVE_ANIMAL_PHONE: '(111) 111-1111',
  MAX_ZOOM_LEVEL: 18,
  IMAGE_COMPRESSION_QUALITY: 0.25, // 1 is max quality
  SHOW_STORYBOOK: __DEV__ && !process.env.JEST_WORKER_ID && !global.__REMOTEDEV__,
  UNKNOWN: 'unknown',
  QUERY_KEYS: {
    reports: 'reports',
    profile: 'profile',
  },
  API_REQUEST_TIMEOUT: 20000,
  MAX_TRACKING_TIME: 1000 * 60 * 60 * 12, // 12 hours
};
