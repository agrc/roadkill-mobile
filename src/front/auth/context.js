import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import propTypes from 'prop-types';
import React from 'react';
import config from '../config';
import { isTokenExpired, useAsyncError, useSecureState } from '../utilities';
import useFacebookProvider from './providers/facebook';
import useGoogleProvider from './providers/google';
import useUtahIDProvider from './providers/utahid';

export const STATUS = {
  loading: 'loading',
  success: 'success',
  failure: 'failure',
  idle: 'idle',
};

WebBrowser.maybeCompleteAuthSession();
const AuthContext = React.createContext();

export function AuthContextProvider({ children, onReady }) {
  const [authInfo, setAuthInfo] = useSecureState(config.USER_STORE_KEY);
  // has the following shape:
  // {
  //    oauthUser: object as returned from the oauth request,
  //    providerName: string,
  //    user: object as returned from the login api endpoint,
  //    registered: boolean
  // }

  const [userType, setUserType] = useSecureState(config.USER_TYPE_KEY);
  const [status, setStatus] = React.useState(STATUS.idle);
  const facebookProvider = useFacebookProvider();
  const googleProvider = useGoogleProvider();
  const utahidProvider = useUtahIDProvider();
  // provider should have the following shape:
  // {
  //   logIn: resolves with oauthUser object,
  //   logOut: resolves with null,
  //   getBearerToken: resolves with token, (utahid only)
  // }

  const PROVIDER_LOOKUP = {
    facebook: facebookProvider,
    google: googleProvider,
    utahid: utahidProvider,
  };
  const currentProvider = React.useRef(null);
  const throwAsyncError = useAsyncError();

  // best practice to speed up browser for android
  // ref: https://docs.expo.io/guides/authentication/#warming-the-browser
  React.useEffect(() => {
    WebBrowser.warmUpAsync();

    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  React.useEffect(() => {
    if (authInfo === null || authInfo) {
      if (authInfo) {
        if (isTokenExpired(authInfo.oauthUser)) {
          console.log('cached token is expired');
          logIn(authInfo.providerName, userType);
        } else {
          console.log(authInfo);
          currentProvider.current = PROVIDER_LOOKUP[authInfo.providerName];
        }
      }
      onReady();
    }
  }, [authInfo]);

  const logIn = async (providerName, userType) => {
    setStatus(STATUS.loading);

    try {
      const oauthUser = await PROVIDER_LOOKUP[providerName].logIn();
      const token = await PROVIDER_LOOKUP[providerName].getBearerToken();

      const response = await fetch(`${config.API}/login`, {
        method: 'POST',
        body: JSON.stringify({
          auth_id: oauthUser.sub,
          auth_provider: providerName,
          email: oauthUser.email,
          first_name: oauthUser.given_name,
          last_name: oauthUser.family_name,
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
      });
      const { user, registered } = await response.json();

      setAuthInfo({
        oauthUser,
        user,
        providerName,
        registered,
      });

      setStatus(STATUS.success);

      return registered;
    } catch (error) {
      console.log(`error logging in: ${error.message}`);
      setStatus(STATUS.failure);
      throwAsyncError(error);
    }
  };

  const registerUser = async (userData) => {
    const token = await getBearerToken();
    const response = await fetch(`${config.API}/register`, {
      method: 'POST',
      body: JSON.stringify(userData),
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
    });

    const responseJson = await response.json();

    setAuthInfo({
      ...authInfo,
      user: responseJson.newUser,
      registered: true,
    });
  };

  const logOut = async () => {
    setStatus(STATUS.loading);

    currentProvider.current.logOut();

    setAuthInfo(null);

    await SecureStore.deleteItemAsync(config.USER_STORE_KEY);
    await SecureStore.deleteItemAsync(config.USER_TYPE_KEY);

    setStatus(STATUS.idle);
  };

  const getBearerToken = async () => {
    if (!authInfo) {
      throw new Error('user is not logged in!');
    }

    try {
      return await currentProvider.current.getBearerToken();
    } catch (error) {
      throwAsyncError(error);
    }
  };

  return (
    <AuthContext.Provider
      value={{ authInfo, logIn, logOut, status, getBearerToken, setUserType, userType, registerUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
AuthContextProvider.propTypes = {
  children: propTypes.object,
  onReady: propTypes.func,
};

export default function useAuth() {
  const context = React.useContext(AuthContext);

  if (!context) {
    throw new Error('AuthContext is required');
  }

  return context;
}
