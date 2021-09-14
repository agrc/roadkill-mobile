import { useAuthRequest } from 'expo-auth-session/providers/google';
import ky from 'ky';
import React from 'react';
import config from '../../config';
import { useAsyncError } from '../../utilities';

export const isAuthenticationExpired = (auth) => {
  const expireTime = (auth.issuedAt + parseInt(auth.expiresIn)) * 1000;

  return expireTime < Date.now();
};

export default function useGoogleProvider() {
  const authentication = React.useRef(null);
  const exchangePromise = React.useRef(null);
  // eslint-disable-next-line no-unused-vars
  const [_, result, promptAsync] = useAuthRequest(
    {
      expoClientId: process.env.GOOGLE_OAUTH_CLIENT_ID_EXPO_GO,
      androidClientId: process.env.GOOGLE_OAUTH_CLIENT_ID_ANDROID,
      iosClientId: process.env.GOOGLE_OAUTH_CLIENT_ID_IOS,
      selectAccount: true,
    },
    {
      path: config.OAUTH_REDIRECT_SCREEN,
    }
  );
  const throwAsyncError = useAsyncError();

  React.useEffect(() => {
    if (!exchangePromise.current) return;
    if (result?.type === 'success' && result.authentication) {
      authentication.current = result.authentication;
      exchangePromise.current.resolve(result.authentication);
    } else if (result?.type === 'error' || result?.type === 'cancel') {
      authentication.current = null;
      exchangePromise.current.reject(result?.error);
    }
  }, [result]);
  const getAuthentication = async () => {
    try {
      const promptResponse = await promptAsync();

      if (promptResponse?.type === 'success') {
        authentication.current = promptResponse.authentication;
        console.log('authentication successful');
        console.log(promptResponse);
        if (!promptResponse.authentication) {
          const promise = new Promise((resolve, reject) => {
            exchangePromise.current = { resolve, reject };
          });

          return promise;
        }

        return promptResponse.authentication;
      } else if (['cancel', 'dismiss'].indexOf(promptResponse?.type) > -1) {
        console.log('authentication cancelled or dismissed', promptResponse);
        return null;
      } else {
        throwAsyncError(
          new Error(`promptResponse.type: ${promptResponse.type}; promptResponse: ${JSON.stringify(promptResponse)}`)
        );
      }
    } catch (error) {
      throwAsyncError(error);
    }
  };

  const logIn = async () => {
    const auth = await getAuthentication();

    if (!auth) {
      return null;
    }

    const { accessToken } = auth;

    let user;
    try {
      user = await ky('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }).json();
    } catch (error) {
      throwAsyncError(error);
    }

    return user;
  };

  const logOut = () => {
    authentication.current = null;
  };

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
