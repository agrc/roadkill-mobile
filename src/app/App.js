import * as React from "react";
import { Button } from "react-native";
import { StyleSheet, Text, View } from "react-native";
import useAuth from './auth';

if(__DEV__) {
  import('./ReactotronConfig').then(() => console.log('Reactotron Configured'))
}

export default function App() {
  const {userInfo, getAccessToken, logIn, logOut, status} = useAuth();
  const [token, setToken] = React.useState(null);

  return (
    <View style={styles.container}>
      <Button
        disabled={status === 'pending'}
        title="Login"
        onPress={() => {
          logIn()
        }}
      />
      {<Text>user email: {userInfo?.email}</Text>}
      {<Text>bearer token: {token?.slice(0, 10)}</Text>}
      {<Text>status: {status}</Text>}
      <Button
        title="Get Access Token"
        onPress={() => {
          getAccessToken().then(accessToken => setToken(accessToken)).catch(error => console.error(error));
        }}
      />
      <Button
        title="Log Out"
        onPress={() => {
          logOut();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    display: 'flex',
    height: '100%'
  },
});
