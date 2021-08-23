import Constants from 'expo-constants';

let API = process.env.API;
// localhost/10.0.2.2 only work for emulators running on the same machine as the dev server
// how to handle separate devices? ngrok? localtunnel? deploy to gcp dev?
if (__DEV__ && !process.env.JEST_WORKER_ID) {
  if (!Constants.isDevice && Constants.platform.android) {
    API = API.replace('localhost', '10.0.2.2');
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
  },
  PROVIDER_NAMES: {
    google: 'google',
    facebook: 'facebook',
    utahid: 'utahid',
  },
  OAUTH_REDIRECT_SCREEN: 'login', // if user is already registered, then they will be sent to the main navigator
  USER_STORE_KEY: 'USER_INFO',
  USER_TYPE_KEY: 'USER_TYPE',
  URLS: {
    LITE: 'https://discover.agrc.utah.gov/login/path/alabama-anvil-picnic-sunset/tiles/lite_basemap/{z}/{x}/{y}.jpg',
  },
  SUPPORT_EMAIL: 'wvc-dnr-dwr-notify@utah.gov',
  RELEASE_CHANNELS: {
    production: 'production',
    staging: 'staging',
  },
  SPINNER_DELAY: 250,
};
