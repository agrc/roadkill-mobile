import { ResponseType } from 'expo-auth-session';
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
  const exchangePromise = React.useRef(null);
  const [_, result, promptAsync] = useAuthRequest(
    {
      expoClientId: process.env.GOOGLE_OAUTH_CLIENT_ID_EXPO_GO,
      androidClientId: process.env.GOOGLE_OAUTH_CLIENT_ID_ANDROID,
      iosClientId: process.env.GOOGLE_OAUTH_CLIENT_ID_IOS,
      selectAccount: true,
      responseType: ResponseType.TOKEN,
    },
    {
      path: config.OAUTH_REDIRECT_SCREEN,
    }
  );
  const throwAsyncError = useAsyncError();

  React.useEffect(() => {
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
          exchangePromise.current = new Promise();

          return exchangePromise.current;
        }

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

    let user;
    try {
      const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      user = await response.json();
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
