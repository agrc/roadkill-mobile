import commonConfig from 'common/config';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import ky from 'ky';
import propTypes from 'prop-types';
import React from 'react';
import { Alert, Platform } from 'react-native';
import { useQueryClient } from 'react-query';
import * as Sentry from 'sentry-expo';
import config from '../services/config';
import { updateConstants } from '../services/constants';
import { useAsyncError, useSecureState } from '../services/utilities';
import useAppleProvider from './providers/apple';
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
const timeout = config.API_REQUEST_TIMEOUT;

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
  const appleProvider = useAppleProvider();
  // provider should have the following shape:
  // {
  //   logIn: resolves with oauthUser object,
  //   logOut: resolves with null,
  //   getBearerToken: resolves with token
  // }

  const PROVIDER_LOOKUP = {
    apple: appleProvider,
    facebook: facebookProvider,
    google: googleProvider,
    utahid: utahidProvider,
  };

  let currentProvider;
  if (authInfo) {
    currentProvider = PROVIDER_LOOKUP[authInfo.providerName];
  }

  const throwAsyncError = useAsyncError();

  React.useEffect(() => {
    if (Platform.OS == 'ios') {
      return;
    }

    let browserPackage;
    const giddyUp = async () => {
      // best practice to speed up browser for android
      // ref: https://docs.expo.io/guides/authentication/#warming-the-browser
      const tabsSupportingBrowsers = await WebBrowser.getCustomTabsSupportingBrowsersAsync();
      browserPackage = tabsSupportingBrowsers?.preferredBrowserPackage;

      WebBrowser.warmUpAsync(browserPackage);
    };

    giddyUp();

    return () => {
      WebBrowser.coolDownAsync(browserPackage);
    };
  }, []);

  React.useEffect(() => {
    if (authInfo === null || authInfo) {
      console.log('authInfo', authInfo);
      onReady();
    }
  }, [authInfo]);

  const logIn = async (providerName) => {
    setStatus(STATUS.loading);

    try {
      const oauthUser = await PROVIDER_LOOKUP[providerName].logIn();
      console.log('oauthUser', oauthUser);

      let token;
      if (oauthUser) {
        token = await PROVIDER_LOOKUP[providerName].getBearerToken();
      } else {
        // user cancelled login
        setStatus(STATUS.failure);

        setAuthInfo({
          user: null,
          registered: false,
        });

        return { success: false, registered: false };
      }

      const loginResponse = await ky
        .post(`${config.API}/user/login`, {
          json: {
            auth_id: oauthUser.sub,
            auth_provider: providerName,
            email: oauthUser.email,
            first_name: oauthUser.given_name,
            last_name: oauthUser.family_name,
          },
          headers: {
            Authorization: token,
            [commonConfig.versionHeaderName]: commonConfig.apiVersion,
          },
          timeout,
        })
        .json();
      const { user, registered, constants } = loginResponse;

      setAuthInfo({
        oauthUser,
        user,
        providerName,
        registered,
      });

      updateConstants(constants);

      setStatus(STATUS.success);

      return { success: true, registered };
    } catch (error) {
      console.log(`error logging in: ${error?.message}`);
      Sentry.Native.captureException(error);
      setStatus(STATUS.failure);

      throw error;
    }
  };

  const registerUser = async (userData) => {
    const token = await getBearerToken();
    const responseJson = await ky
      .post(`${config.API}/user/register`, {
        json: userData,
        headers: {
          Authorization: token,
          [commonConfig.versionHeaderName]: commonConfig.apiVersion,
        },
        timeout,
      })
      .json();

    setAuthInfo({
      ...authInfo,
      user: responseJson.newUser,
      registered: true,
    });
  };

  const queryClient = useQueryClient();
  const logOut = (skipConfirm = false) => {
    return new Promise((resolve) => {
      const doLogOut = async () => {
        setStatus(STATUS.loading);

        try {
          const response = await ky.post(`${config.API}/user/logout`, {
            headers: {
              Authorization: await getBearerToken(),
              [commonConfig.versionHeaderName]: commonConfig.apiVersion,
            },
            timeout,
          });

          if (response.status !== 200) {
            console.error(`logout failed: ${response.body}`);
          }
        } catch (error) {
          console.error(`logout failed: ${error.message}`);
        }

        try {
          await currentProvider.logOut();
        } catch (error) {
          console.error(`provider logout failed: ${error.message}`);
        }

        setAuthInfo(null);

        await SecureStore.deleteItemAsync(config.USER_STORE_KEY);
        await SecureStore.deleteItemAsync(config.USER_TYPE_KEY);

        queryClient.clear();

        setStatus(STATUS.idle);

        resolve(true);
      };

      if (skipConfirm) {
        return doLogOut();
      }

      Alert.alert(
        'Are you sure?',
        null,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Logout',
            onPress: doLogOut,
          },
        ],
        {
          cancelable: true,
          onDismiss: () => resolve(false),
        }
      );
    });
  };

  const getBearerToken = async () => {
    console.log('context/getBearerToken');

    if (!authInfo) {
      throw new Error('user is not logged in!');
    }

    try {
      return await currentProvider.getBearerToken();
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
