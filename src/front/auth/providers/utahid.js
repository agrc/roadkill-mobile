import { exchangeCodeAsync, makeRedirectUri, refreshAsync, revokeAsync, useAuthRequest } from 'expo-auth-session';
import jwt_decode from 'jwt-decode';
import ky from 'ky';
import config from '../../config';
import { isTokenExpired, useAsyncError, useSecureRef } from '../../utilities';

let redirectUri = makeRedirectUri({ scheme: config.SCHEME });
if (__DEV__) {
  // expo adds this because it is a web server and needs to know that this is a deep link
  redirectUri += '/--/';
}
redirectUri += config.OAUTH_REDIRECT_SCREEN;
console.log('redirectUri', redirectUri);

// ref: https://login.dts.utah.gov/sso/oauth2/.well-known/openid-configuration
const discovery = {
  authorizationEndpoint: 'https://login.dts.utah.gov/sso/oauth2/authorize',
  tokenEndpoint: `${config.API}/user/token`,
  revocationEndpoint: 'https://login.dts.utah.gov/sso/oauth2/token/revoke',
};

export default function useUtahIDProvider() {
  const [accessToken, setAccessToken] = useSecureRef('UTAHID_ACCESS_TOKEN');
  const [refreshToken, setRefreshToken] = useSecureRef('UTAHID_REFRESH_TOKEN');
  const [idToken, setIdToken] = useSecureRef('UTAHID_ID_TOKEN');
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

  const getTokens = async () => {
    console.log('getTokens');

    try {
      const response = await promptAsync();

      if (response?.type === 'success') {
        const tokenResponse = await exchangeCodeForToken(response.params.code);
        setAccessToken(tokenResponse.accessToken);
        setRefreshToken(tokenResponse.refreshToken);
        setIdToken(tokenResponse.idToken);

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

  const logOut = async () => {
    console.log('utahid: logOut');

    // I'm not sure that I need the two token revoking if I'm hitting the endSession endpoint...
    if (hasValidToken()) {
      await revokeAsync(
        {
          clientId: config.CLIENT_ID,
          token: refreshToken.current,
        },
        discovery
      );
    }

    if (accessToken.current && !isTokenExpired(jwt_decode(accessToken.current))) {
      await revokeAsync(
        {
          clientId: config.CLIENT_ID,
          token: accessToken.current,
        },
        discovery
      );
    }

    if (idToken.current && !isTokenExpired(jwt_decode(idToken.current))) {
      const response = await ky.get('https://login.dts.utah.gov/sso/oauth2/connect/endSession', {
        searchParams: { id_token_hint: idToken.current },
      });

      if (response.status !== 204) {
        console.warn('logOut: failed to end session', response.body);
      }
    }

    setAccessToken(null);
    setRefreshToken(null);
    setIdToken(null);
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

    if (!hasValidToken()) {
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

  const hasValidToken = () => {
    return refreshToken.current && !isTokenExpired(jwt_decode(refreshToken.current));
  };

  return { logIn, logOut, getBearerToken, hasValidToken };
}
