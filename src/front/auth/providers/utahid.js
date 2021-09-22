import { exchangeCodeAsync, makeRedirectUri, refreshAsync, useAuthRequest } from 'expo-auth-session';
import jwt_decode from 'jwt-decode';
import React from 'react';
import config from '../../config';
import { isTokenExpired, useAsyncError, useSecureRef } from '../../utilities';

let redirectUri = makeRedirectUri({ scheme: config.SCHEME });
if (__DEV__) {
  // expo adds this because it is a web server and needs to know that this is a deep link
  redirectUri += '/--/';
}
redirectUri += config.OAUTH_REDIRECT_SCREEN;

const discovery = {
  authorizationEndpoint: 'https://login.dts.utah.gov/sso/oauth2/authorize',
  tokenEndpoint: `${config.API}/user/token`,

  // this is not used at the moment but could be used to log the user out of the browser session
  endSessionEndpoint: 'https://login.dts.utah.gov/sso/oauth2/connect/endSession',
};

export default function useUtahIDProvider() {
  const [accessToken, setAccessToken] = useSecureRef('UTAHID_ACCESS_TOKEN');
  const [refreshToken, setRefreshToken] = useSecureRef('UTAHID_REFRESH_TOKEN');
  // eslint-disable-next-line no-unused-vars
  const [request, _, promptAsync] = useAuthRequest(
    {
      clientId: config.CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
    },
    discovery
  );
  const throwAsyncError = useAsyncError();

  React.useEffect(() => {
    if (refreshToken.current && isTokenExpired(jwt_decode(refreshToken.current))) {
      getTokens();
    }
  }, [refreshToken.current]);

  const getTokens = async () => {
    try {
      const response = await promptAsync();

      if (response?.type === 'success') {
        const tokenResponse = await exchangeCodeForToken(response.params.code);
        setAccessToken(tokenResponse.accessToken);
        setRefreshToken(tokenResponse.refreshToken);

        return {
          idToken: tokenResponse.idToken,
          accessToken: tokenResponse.accessToken,
          refreshToken: tokenResponse.refreshToken,
        };
      } else if (['cancel', 'dismiss'].indexOf(response?.type) > -1) {
        return null;
      } else {
        throwAsyncError(new Error(`response.type: ${response.type}; response: ${JSON.stringify(response)}`));
      }
    } catch (error) {
      throwAsyncError(error);
    }
  };

  const logIn = async () => {
    console.log('utahid: logIn');

    const tokens = await getTokens();

    if (!tokens) return null;

    return jwt_decode(tokens.idToken);
  };

  const logOut = () => {
    setAccessToken(null);
    setRefreshToken(null);
  };

  const getBearerToken = async () => {
    console.log('getBearerToken');

    const prefix = `${config.PROVIDER_NAMES.utahid}:Bearer `;
    if (accessToken.current && !isTokenExpired(jwt_decode(accessToken.current))) {
      return prefix + accessToken.current;
    }

    const newToken = await refreshAccessToken();

    if (newToken) {
      return prefix + newToken;
    }

    return null;
  };

  const exchangeCodeForToken = async (code) => {
    console.log('exchangeCodeForToken');

    try {
      const tokenResponse = await exchangeCodeAsync(
        {
          clientId: config.CLIENT_ID,
          code,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier,
            code_challenge: request.codeChallenge,
          },
        },
        discovery
      );

      return tokenResponse;
    } catch (error) {
      throwAsyncError(error);
    }
  };

  const refreshAccessToken = async () => {
    console.log('refreshAccessToken');

    if (!refreshToken.current || isTokenExpired(jwt_decode(refreshToken.current))) {
      const tokens = await getTokens();

      return tokens?.accessToken;
    }

    try {
      const tokenResponse = await refreshAsync(
        {
          clientId: config.CLIENT_ID,
          refreshToken: refreshToken.current,
        },
        discovery
      );

      setAccessToken(tokenResponse.accessToken);

      return tokenResponse.accessToken;
    } catch (error) {
      throwAsyncError(error);
    }
  };

  return { logIn, logOut, getBearerToken };
}
