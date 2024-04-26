import commonConfig from 'common/config';
import { jwtDecode } from 'jwt-decode';
import React from 'react';
import { Platform } from 'react-native';
import {
  AccessToken,
  AuthenticationToken,
  LoginManager,
  Profile,
  Settings,
} from 'react-native-fbsdk-next';
import myFetch from '../../services/fetch';
import t from '../../services/localization';
import { useAsyncError } from '../../services/utilities';
// this polyfill for atob should no longer be needed after RN 0.74
// ref: https://github.com/auth0/jwt-decode/issues/241
import { decode } from 'base-64';

global.atob = decode;

Settings.initializeSDK();

export const isAuthenticationExpired = (auth) => {
  return auth.expirationTime < Date.now();
};

const cancelledMessage = t('errors.userCancelledLogin');

export default function useFacebookProvider() {
  const authentication = React.useRef(null);
  const throwAsyncError = useAsyncError();

  const refreshToken = async () => {
    console.log('refreshing token');
    if (Platform.OS === 'ios') {
      const result = await AuthenticationToken.getAuthenticationTokenIOS();

      console.log('limit login token', result.authenticationToken);

      authentication.current = {
        token: result.authenticationToken,
        expirationTime:
          jwtDecode(result.authenticationToken.toString()).exp * 1000,
      };
    } else {
      let accessToken = await AccessToken.getCurrentAccessToken();

      if (!accessToken || !accessToken?.accessToken) {
        console.log('no access token, refreshing...');
        await AccessToken.refreshCurrentAccessTokenAsync();

        accessToken = await AccessToken.getCurrentAccessToken();

        if (!accessToken || !accessToken?.accessToken) {
          console.log('unable to refresh access token, getting fresh auth');
          await getAuthentication();

          accessToken = await AccessToken.getCurrentAccessToken();

          if (!accessToken || !accessToken?.accessToken) {
            throwAsyncError(new Error('Unable to get access token'));
          }
        }
      }

      console.log('token', accessToken.accessToken.toString());

      authentication.current = {
        token: accessToken.accessToken.toString(),
        expirationTime: accessToken.expirationTime,
      };
    }
  };

  const getAuthentication = async () => {
    console.log('getting authentication');
    let result;
    try {
      result = await LoginManager.logInWithPermissions(
        ['public_profile', 'email'],
        'limited',
      );
      console.log('login result', result);
    } catch (error) {
      throwAsyncError(error);
    }

    if (result.isCancelled) {
      throw Error(cancelledMessage);
    }
  };

  const logIn = async () => {
    try {
      await getAuthentication();
    } catch (error) {
      if (error.message === cancelledMessage) {
        return null;
      }

      throwAsyncError(error);
    }

    await refreshToken();

    let user;
    if (Platform.OS === 'ios') {
      try {
        console.log('getting profile information (iOS)');
        user = await Profile.getCurrentProfile();
      } catch (error) {
        throwAsyncError(error);
      }
      console.log('user', user);

      return {
        name: user.name,
        sub: user.userID,
        email: user.email,
        given_name: user.firstName,
        family_name: user.lastName,
      };
    } else {
      try {
        // using user = await Profile.getCurrentProfile(); doesn't return an email on Android for some reason
        // so we have to use the graph api for now
        // ref: https://github.com/thebergamo/react-native-fbsdk-next#get-profile-information
        user = await myFetch(
          'https://graph.facebook.com/me',
          {
            searchParams: {
              access_token: authentication.current.token,
              fields: 'id,first_name,last_name,name,email',
            },
          },
          true,
        );
      } catch (error) {
        throwAsyncError(error);
      }

      return {
        name: user.name,
        sub: user.id,
        email: user.email,
        given_name: user.first_name,
        family_name: user.last_name,
      };
    }
  };

  const logOut = async () => {
    try {
      LoginManager.logOut();
    } catch (error) {
      throwAsyncError(error);
    }
  };

  const getBearerToken = async () => {
    const prefix = `${commonConfig.authProviderNames.facebook}: Bearer `;

    console.log('authentication.current', authentication.current);

    if (!hasValidToken()) {
      await refreshToken();
    }

    return prefix + authentication.current.token;
  };

  const hasValidToken = () =>
    authentication.current && !isAuthenticationExpired(authentication.current);

  return { logIn, logOut, getBearerToken, hasValidToken, isReady: true };
}
