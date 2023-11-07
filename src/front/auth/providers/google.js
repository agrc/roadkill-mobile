import commonConfig from 'common/config';
import { revokeAsync } from 'expo-auth-session';
import { discovery, useAuthRequest } from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import React from 'react';
import config from '../../services/config';
import myFetch from '../../services/fetch';
import { useAsyncError } from '../../services/utilities';

export const isAuthenticationExpired = (auth) => {
  const expireTime = (auth.issuedAt + parseInt(auth.expiresIn)) * 1000;

  return expireTime < Date.now();
};

export default function useGoogleProvider() {
  const authentication = React.useRef(null);
  const exchangePromise = React.useRef(null);
  // eslint-disable-next-line no-unused-vars
  const [request, result, promptAsync] = useAuthRequest(
    {
      androidClientId:
        Constants.expoConfig.extra.GOOGLE_OAUTH_CLIENT_ID_ANDROID,
      iosClientId: Constants.expoConfig.extra.GOOGLE_OAUTH_CLIENT_ID_IOS,
      selectAccount: true,
    },
    {
      path: config.OAUTH_REDIRECT_SCREEN,
    },
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
          new Error(
            `promptResponse.type: ${
              promptResponse.type
            }; promptResponse: ${JSON.stringify(promptResponse)}`,
          ),
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
      user = await myFetch(
        'https://openidconnect.googleapis.com/v1/userinfo',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        true,
      );
    } catch (error) {
      throwAsyncError(error);
    }

    return user;
  };

  const logOut = async () => {
    if (
      authentication.current &&
      !isAuthenticationExpired(authentication.current)
    ) {
      await revokeAsync(
        { token: authentication.current.accessToken },
        discovery,
      );
    }

    authentication.current = null;
  };

  const getBearerToken = async () => {
    const prefix = `${commonConfig.authProviderNames.google}:Bearer `;
    if (hasValidToken()) {
      return prefix + authentication.current.accessToken;
    }

    const auth = await getAuthentication();

    if (auth?.accessToken) {
      return prefix + auth.accessToken;
    } else {
      throwAsyncError(new Error('No access token'));
    }
  };

  const hasValidToken = () =>
    authentication.current && !isAuthenticationExpired(authentication.current);

  return { logIn, logOut, getBearerToken, hasValidToken };
}
