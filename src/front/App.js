import 'react-native-get-random-values';
import * as React from 'react';
import { Button } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import useAuth from './auth';
import config from './config';
import Constants from 'expo-constants';
import * as Analytics from 'expo-firebase-analytics';
import * as SecureStorage from 'expo-secure-store';
import { v4 as uuid } from 'uuid';

if (__DEV__) {
  import('./ReactotronConfig').then(() => console.log('Reactotron Configured'));
}

export default function App() {
  const { userInfo, getAccessToken, logIn, logOut, status, redirectUri } = useAuth();
  const [token, setToken] = React.useState(null);
  const [secureResponse, setSecureResponse] = React.useState(null);
  const trySecure = async () => {
    setSecureResponse(null);

    const response = await fetch(`${config.API}/secure`, {
      headers: {
        Authorization: await getAccessToken(),
      },
    });

    setSecureResponse(`${response.status} | ${await response.text()}`);
  };

  React.useEffect(() => {
    const initAnalytics = async () => {
      if (Constants.appOwnership === 'expo') {
        const key = 'CLIENT_ID';
        let id = await SecureStorage.getItemAsync(key);

        if (!id) {
          id = uuid();

          SecureStorage.setItemAsync(key, id);
        }

        // needs to be called before any other analytics methods
        Analytics.setClientId(id);
      }

      if (__DEV__) {
        Analytics.setDebugModeEnabled(true);
      }

      Analytics.setCurrentScreen('home'); // doesn't work in expo go
      Analytics.logEvent('test_event');
    };

    initAnalytics();
  }, []);

  return (
    <View style={styles.container}>
      <Button disabled={status === 'pending'} title="Login" onPress={logIn} />
      <Text>user email: {userInfo?.email}</Text>
      <Text>bearer token: {token?.slice(0, 10)}</Text>
      <Text>status: {status}</Text>
      <Button
        title="Get Access Token"
        onPress={() => {
          getAccessToken()
            .then((accessToken) => setToken(accessToken))
            .catch((error) => console.error(error));
        }}
      />
      <Button title="Log Out" onPress={logOut} />
      <Button title="Query Secured Endpoint" onPress={trySecure} />
      <Text>secure response: {secureResponse}</Text>
      <Text>{redirectUri}</Text>
      <Text>Revision: {Constants.manifest.revisionId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
});
