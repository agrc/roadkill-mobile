import * as React from 'react';
import { Button } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import useAuth from './auth';
import config from './config';

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
