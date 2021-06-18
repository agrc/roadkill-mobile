import React from 'react';
import { Button, Text, Divider, Layout, Icon, TopNavigation, TopNavigationAction } from '@ui-kitten/components';
import { SafeAreaView } from 'react-native';
import useAuth from '../auth';
import config from '../config';
import Constants from 'expo-constants';
import propTypes from 'prop-types';

export default function LoginScreen({ navigation }) {
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

  const BackIcon = (props) => <Icon {...props} name="arrow-back" />;
  const BackAction = () => <TopNavigationAction icon={BackIcon} onPress={() => navigation.goBack()} />;
  const TestIcon = (props) => <Icon name="link" {...props} />;
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <TopNavigation title="WVC" alignment="center" accessoryLeft={BackAction} />
      <Divider />
      <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Button disabled={status === 'pending'} onPress={logIn} accessoryRight={TestIcon}>
          Login
        </Button>
        <Text>user email: {userInfo?.email}</Text>
        <Text>bearer token: {token?.slice(0, 10)}</Text>
        <Text>status: {status}</Text>
        <Button
          onPress={() => {
            getAccessToken()
              .then((accessToken) => setToken(accessToken))
              .catch((error) => console.error(error));
          }}
        >
          Get Access Token
        </Button>
        <Button onPress={logOut}>Log Out</Button>
        <Button onPress={trySecure}>Query Secured Endpoint</Button>
        <Text>secure response: {secureResponse}</Text>
        <Text>{redirectUri}</Text>
        <Text>Revision: {Constants.manifest.revisionId}</Text>
      </Layout>
    </SafeAreaView>
  );
}

LoginScreen.propTypes = {
  navigation: propTypes.object,
};
