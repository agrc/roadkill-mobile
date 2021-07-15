import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import propTypes from 'prop-types';
import React from 'react';
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
const USER_STORE_KEY = 'USER_INFO';
const USER_TYPE_KEY = 'USER_TYPE';

WebBrowser.maybeCompleteAuthSession();
const AuthContext = React.createContext();

export function AuthContextProvider({ children, onReady }) {
  const [authInfo, setAuthInfo] = useSecureState(USER_STORE_KEY);
  // has the following shape:
  // {
  //    providerName: string,
  //    user: object as returned from the oauth request,
  //    registered: boolean
  // }

  const [userType, setUserType] = useSecureState(USER_TYPE_KEY);
  const [status, setStatus] = React.useState(STATUS.idle);
  const facebookProvider = useFacebookProvider();
  const googleProvider = useGoogleProvider();
  const utahidProvider = useUtahIDProvider();
  // provider should have the following shape:
  // {
  //   logIn: resolves with authInfo object,
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
        if (isTokenExpired(authInfo.user)) {
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
      const newAuthInfo = await PROVIDER_LOOKUP[providerName].logIn(userType);
      setAuthInfo(newAuthInfo);
      setStatus(STATUS.success);

      return newAuthInfo.registered;
    } catch (error) {
      console.log(`error logging in: ${error.message}`);
      setStatus(STATUS.failure);
      throwAsyncError(error);
    }
  };

  const logOut = async () => {
    setStatus(STATUS.loading);

    currentProvider.current.logOut();

    setAuthInfo(null);

    await SecureStore.deleteItemAsync(USER_STORE_KEY);
    await SecureStore.deleteItemAsync(USER_TYPE_KEY);

    setStatus(STATUS.idle);
  };

  const getBearerToken = async () => {
    if (!authInfo) {
      throw new Error('user is not logged in!');
    }

    // only applicable for utahid
    try {
      return await currentProvider.current.getBearerToken();
    } catch (error) {
      throwAsyncError(error);
    }
  };

  return (
    <AuthContext.Provider value={{ authInfo, logIn, logOut, status, getBearerToken, setUserType, userType }}>
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
