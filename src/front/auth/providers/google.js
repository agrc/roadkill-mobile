import { useAuthRequest } from 'expo-auth-session/providers/google';
import React from 'react';
import config from '../../config';
import { useAsyncError } from '../../utilities';

export const isAuthenticationExpired = (auth) => {
  const expireTime = (auth.issuedAt + parseInt(auth.expiresIn)) * 1000;

  return expireTime < Date.now();
};

export default function useGoogleProvider() {
  const authentication = React.useRef(null);
  const promptAsync = useAuthRequest(
    {
      expoClientId: process.env.GOOGLE_OAUTH_CLIENT_ID_EXPO_GO,
      androidClientId: process.env.GOOGLE_OAUTH_CLIENT_ID_ANDROID,
      iosClientId: process.env.GOOGLE_OAUTH_CLIENT_ID_IOS,
      selectAccount: true,
    },
    {
      path: config.OAUTH_REDIRECT_SCREEN,
    }
  )[2];
  const throwAsyncError = useAsyncError();

  const getAuthentication = async () => {
    try {
      const promptResponse = await promptAsync();

      if (promptResponse?.type === 'success') {
        authentication.current = promptResponse.authentication;
        console.log('authentication', authentication);

        return promptResponse.authentication;
      } else if (promptResponse?.type === 'cancel') {
        return null;
      } else {
        new Error(`${promptResponse.type} ${promptResponse.message ? promptResponse.message : null}`);
      }
    } catch (error) {
      throwAsyncError(error);
    }
  };

  const logIn = async () => {
    const { accessToken } = await getAuthentication();

    if (!accessToken) {
      return null;
    }

    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const user = await response.json();

    return user;
  };

  const logOut = () => {};

  const getBearerToken = async () => {
    const prefix = `${config.PROVIDER_NAMES.google}:Bearer `;
    if (authentication.current && !isAuthenticationExpired(authentication.current)) {
      return prefix + authentication.current.accessToken;
    }

    const { accessToken } = await getAuthentication();

    if (accessToken) {
      return prefix + accessToken;
    } else {
      throwAsyncError(new Error('No access token'));
    }
  };

  return { logIn, logOut, getBearerToken };
}
