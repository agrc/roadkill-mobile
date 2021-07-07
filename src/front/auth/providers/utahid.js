import { exchangeCodeAsync, makeRedirectUri, refreshAsync, useAuthRequest } from 'expo-auth-session';
import jwt_decode from 'jwt-decode';
import * as React from 'react';
import config from '../../config';
import { useAsyncError } from '../../utilities';

let redirectUri = `${makeRedirectUri({ scheme: config.SCHEME })}`;
if (__DEV__) {
  // expo adds this because it is a web server and needs to know that this is a deep link
  redirectUri += '/--/';
}
redirectUri += 'login';

const discovery = {
  authorizationEndpoint: 'https://login.dts.utah.gov/sso/oauth2/authorize',
  tokenEndpoint: `${config.API}/token`,

  // this is not used at the moment but could be used to log the user out of the browser session
  endSessionEndpoint: 'https://login.dts.utah.gov/sso/oauth2/connect/endSession',
};

function isTokenExpired(token) {
  const expireTime = token.exp * 1000;

  return expireTime < new Date().getTime();
}

export default function useUtahIDProvider() {
  const accessToken = React.useRef(null);
  const refreshToken = React.useRef(null);
  const [request, _, promptAsync] = useAuthRequest(
    {
      clientId: config.CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
    },
    discovery
  );
  const throwAsyncError = useAsyncError();

  const logIn = async () => {
    try {
      const response = await promptAsync();

      if (response?.type === 'success') {
        const tokenResponse = await exchangeCodeForToken(response.params.code);
        accessToken.current = tokenResponse.accessToken;
        refreshToken.current = tokenResponse.refreshToken;

        return jwt_decode(tokenResponse.idToken);
      } else {
        throwAsyncError(new Error(`${response.type} ${response.message}`));
      }
    } catch (error) {
      throwAsyncError(error);
    }
  };

  const logOut = () => {
    accessToken.current = null;
    refreshToken.current = null;
  };

  const getBearerToken = async () => {
    console.log('getBearerToken');

    const prefix = 'Bearer ';
    if (accessToken.current && !isTokenExpired(accessToken.current)) {
      return prefix + accessToken.current;
    }

    try {
      return prefix + (await refreshAccessToken());
    } catch (error) {
      throwAsyncError(error);
    }
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

    if (!refreshToken.current || isTokenExpired(refreshToken.current)) {
      return null;
    }

    try {
      const tokenResponse = await refreshAsync(
        {
          clientId: config.CLIENT_ID,
          refreshToken: refreshToken.current,
        },
        discovery
      );

      accessToken.current = tokenResponse.accessToken;

      return tokenResponse.accessToken;
    } catch (error) {
      throwAsyncError(error);
    }
  };

  return { logIn, logOut, getBearerToken };
}
