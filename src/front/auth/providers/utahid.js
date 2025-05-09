import commonConfig from 'common/config';
import {
  exchangeCodeAsync,
  refreshAsync,
  revokeAsync,
  useAuthRequest,
} from 'expo-auth-session';
import Constants from 'expo-constants';
import { jwtDecode } from 'jwt-decode';
import config from '../../services/config';
import myFetch from '../../services/fetch';
import {
  isTokenExpired,
  useAsyncError,
  useSecureRef,
} from '../../services/utilities';

const redirectUri = `${Constants.expoConfig.scheme}://${config.OAUTH_REDIRECT_SCREEN}`;
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
    discovery,
  );
  const throwAsyncError = useAsyncError();

  const getTokens = async () => {
    console.log('getTokens');

    if (!request) {
      throwAsyncError(new Error('auth request has not yet finished!'));
    }

    try {
      const response = await promptAsync({ showInRecents: true });
      console.log('response', response);

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
        throwAsyncError(
          new Error(
            `response.type: ${response.type}; response: ${JSON.stringify(
              response,
            )}`,
          ),
        );
      }
    } catch (error) {
      throwAsyncError(error);
    }
  };

  const logIn = async () => {
    console.log('utahid: logIn');

    const tokens = await getTokens();

    if (!tokens) return null;

    return jwtDecode(tokens.idToken);
  };

  const logOut = async () => {
    console.log('utahid: logOut');

    // I'm not sure that I need the two token revoking if I'm hitting the endSession endpoint...
    if (hasValidRefreshToken()) {
      await revokeAsync(
        {
          clientId: config.CLIENT_ID,
          token: refreshToken.current,
        },
        discovery,
      );
    }

    if (
      accessToken.current &&
      !isTokenExpired(jwtDecode(accessToken.current))
    ) {
      await revokeAsync(
        {
          clientId: config.CLIENT_ID,
          token: accessToken.current,
        },
        discovery,
      );
    }

    if (idToken.current && !isTokenExpired(jwtDecode(idToken.current))) {
      const response = await myFetch(
        `https://login.dts.utah.gov/sso/oauth2/connect/endSession`,
        {
          searchParams: {
            id_token_hint: idToken.current,
          },
        },
      );

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

    const prefix = `${commonConfig.authProviderNames.utahid}:Bearer `;
    if (
      accessToken.current &&
      !isTokenExpired(jwtDecode(accessToken.current))
    ) {
      console.log('returning cached token');

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
        discovery,
      );

      return tokenResponse;
    } catch (error) {
      throwAsyncError(error);
    }
  };

  const refreshAccessToken = async () => {
    console.log('refreshAccessToken');

    if (!hasValidRefreshToken()) {
      const tokens = await getTokens();

      return tokens?.accessToken;
    }

    const tokenResponse = await refreshAsync(
      {
        clientId: config.CLIENT_ID,
        refreshToken: refreshToken.current,
      },
      discovery,
    );

    setAccessToken(tokenResponse.accessToken);

    return tokenResponse.accessToken;
  };

  const hasValidRefreshToken = () => {
    return (
      refreshToken.current && !isTokenExpired(jwtDecode(refreshToken.current))
    );
  };

  return {
    logIn,
    logOut,
    getBearerToken,
    hasValidToken: hasValidRefreshToken,
    isReady: !!request,
  };
}
