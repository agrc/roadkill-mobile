import Constants from 'expo-constants';

let API = process.env.API;
// localhost/10.0.2.2 only work for emulators running on the same machine as the dev server
// how to handle separate devices? ngrok? localtunnel? deploy to gcp dev?
if (__DEV__) {
  if (!Constants.isDevice && Constants.platform.android) {
    API = API.replace('localhost', '10.0.2.2');
  } else if (Constants.isDevice) {
    API = API.replace('localhost', Constants.manifest.debuggerHost.split(':').shift());
    console.log('API', API);
  }
}

export default {
  CLIENT_ID: process.env.CLIENT_ID,
  API,
  SCHEME: Constants.manifest.scheme,
  USER_TYPES: {
    public: 'public',
    contractor: 'contractor',
    agencyEmployee: 'agency_employee',
  },
};
