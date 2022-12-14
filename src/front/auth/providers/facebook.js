import commonConfig from 'common/config';
import ky from 'ky';
import React from 'react';
import { AccessToken, LoginManager, Settings } from 'react-native-fbsdk-next';
import { useAsyncError } from '../../services/utilities';

Settings.initializeSDK();

export const isAuthenticationExpired = (auth) => {
  return new Date(auth.expirationDate) < Date.now();
};

const cancelledMessage = 'User cancelled the login process';

export default function useFacebookProvider() {
  const authentication = React.useRef(null);
  const throwAsyncError = useAsyncError();

  const refreshToken = async () => {
    console.log('refreshing token');
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

    authentication.current = {
      token: accessToken.accessToken.toString(),
      expirationDate: accessToken.expirationTime,
    };
  };

  const getAuthentication = async () => {
    console.log('getting authentication');
    let result;
    try {
      result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
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
    try {
      // using user = await Profile.getCurrentProfile(); doesn't return an email on Android for some reason
      // so we have to use the graph api for now
      // ref: https://github.com/thebergamo/react-native-fbsdk-next#get-profile-information
      user = await ky('https://graph.facebook.com/me', {
        searchParams: {
          access_token: authentication.current.token,
          fields: 'id,first_name,last_name,name,email',
        },
      }).json();
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

    if (!hasValidToken()) {
      await refreshToken();
    }

    return prefix + authentication.current.token;
  };

  const hasValidToken = () => authentication.current && !isAuthenticationExpired(authentication.current);

  return { logIn, logOut, getBearerToken };
}
