import * as React from 'react';
import { useAuthRequest } from 'expo-auth-session/providers/google';
import jwt_decode from 'jwt-decode';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import propTypes from 'prop-types';

const STORE_KEY = 'WVC_GOOGLE_USER';

export const STATUS = {
  loading: 'loading',
  success: 'success',
  failure: 'failure',
  idle: 'idle',
};

WebBrowser.maybeCompleteAuthSession();

function isExpired(token) {
  const expireTime = token.exp * 1000;

  return expireTime < new Date().getTime();
}

const AuthContext = React.createContext();

export function AuthContextProvider({ children, setReady }) {
  // should these be kept in secure store rather than in-memory?
  const [userInfo, setUserInfo] = React.useState(null);
  const [status, setStatus] = React.useState(STATUS.idle);
  const [_, response, promptAsync] = useAuthRequest({
    expoClientId: process.env.GOOGLE_OAUTH_CLIENT_ID_EXPO_GO,
    androidClientId: process.env.GOOGLE_OAUTH_CLIENT_ID_ANDROID,
    iosClientId: process.env.GOOGLE_OAUTH_CLIENT_ID_IOS,
    selectAccount: true,
  });
  console.log('status', status);

  // best practice to speed up browser for android
  // ref: https://docs.expo.io/guides/authentication/#warming-the-browser
  React.useEffect(() => {
    WebBrowser.warmUpAsync();

    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  React.useEffect(() => {
    // how to get logged in user, do we care about logging out?
    const prepare = async () => {
      try {
        const cachedUserInfoTxt = await SecureStore.getItemAsync(STORE_KEY);
        const cachedUserInfo = JSON.parse(cachedUserInfoTxt);

        console.log('cachedUserInfo', cachedUserInfo);
        if (cachedUserInfo && !isExpired(cachedUserInfo)) {
          setUserInfo(cachedUserInfo);
        }
      } catch (error) {
        console.warn('error with auth prepare function', error);
      } finally {
        setReady(true);
      }
    };

    prepare();
  }, []);

  const logIn = async () => {
    console.log('logIn');
    setStatus(STATUS.loading);
    try {
      await promptAsync();
    } catch (error) {
      setStatus(STATUS.failure);
      throw error;
    }
  };

  React.useEffect(() => {
    if (!response) return;

    if (response?.type === 'success') {
      console.log('response', response);
      const userToken = jwt_decode(response.params.id_token);
      setUserInfo(userToken);
      SecureStore.setItemAsync(STORE_KEY, JSON.stringify(userToken));
    } else {
      setStatus(STATUS.failure);
      throw new Error(JSON.stringify(response));
    }
  }, [response]);

  const logOut = () => {
    setStatus(STATUS.loading);

    setUserInfo(null);
    SecureStore.setItemAsync(STORE_KEY, '');

    setStatus(STATUS.idle);
    // TODO: I don't think that this is logging out of the browser, do we care?
  };

  return <AuthContext.Provider value={{ userInfo, logIn, logOut, status }}>{children}</AuthContext.Provider>;
}
AuthContextProvider.propTypes = {
  children: propTypes.object,
  setReady: propTypes.func,
};

export default function useAuth() {
  return React.useContext(AuthContext);
}
