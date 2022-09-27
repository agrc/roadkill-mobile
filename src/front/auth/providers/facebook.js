import ky from 'ky';
import React from 'react';
import { AccessToken, LoginManager, Settings } from 'react-native-fbsdk-next';
import config from '../../services/config';
import { useAsyncError } from '../../services/utilities';

Settings.initializeSDK();

export const isAuthenticationExpired = (auth) => {
  return new Date(auth.expirationDate) < Date.now();
};

export default function useFacebookProvider() {
  const authentication = React.useRef(null);
  const throwAsyncError = useAsyncError();

  const refreshToken = async () => {
    console.log('refreshing token');
    const accessToken = await AccessToken.getCurrentAccessToken();

    if (!accessToken?.accessToken) {
      throwAsyncError(new Error('Missing access token'));
    }

    authentication.current = {
      token: accessToken.accessToken.toString(),
      expirationDate: accessToken.expirationTime,
    };
  };

  const getAuthentication = async () => {
    console.log('getting authentication');
    try {
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      console.log('login result', result);

      if (result.isCancelled) {
        throwAsyncError(new Error('User cancelled the login process'));
      }
    } catch (error) {
      throwAsyncError(error);
    }
  };

  const logIn = async () => {
    await getAuthentication();
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
    const prefix = `${config.PROVIDER_NAMES.facebook}: Bearer `;

    if (!hasValidToken()) {
      await refreshToken();
    }

    return prefix + authentication.current.token;
  };

  const hasValidToken = () => authentication.current && !isAuthenticationExpired(authentication.current);

  return { logIn, logOut, getBearerToken, hasValidToken };
}
