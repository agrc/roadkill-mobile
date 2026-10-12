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
import { useSecureRef } from '../../services/utilities';
import React from 'react';

const redirectUri = `${Constants.expoConfig.scheme}://${config.OAUTH_REDIRECT_SCREEN}`;
const EXPIRY_MARGIN_SECONDS = 60;

// ref: https://login.dts.utah.gov/sso/oauth2/.well-known/openid-configuration
const discovery = {
  authorizationEndpoint: 'https://login.dts.utah.gov/sso/oauth2/authorize',
  tokenEndpoint: `${config.API}/user/token`,
  revocationEndpoint: 'https://login.dts.utah.gov/sso/oauth2/token/revoke',
};

const createAuthError = (code, message, cause) => {
  const error = new Error(message);
  error.code = code;
  if (cause) error.cause = cause;

  return error;
};

const decodeToken = (token) => {
  if (!token) return null;

  try {
    return jwtDecode(token);
  } catch (error) {
    return null;
  }
};

const isTokenExpiring = (token) => {
  const expiration = decodeToken(token)?.exp;

  return (
    !expiration ||
    expiration * 1000 <= Date.now() + EXPIRY_MARGIN_SECONDS * 1000
  );
};

const getTokenSubject = (token) => {
  const subject = decodeToken(token)?.sub;

  return typeof subject === 'string' && subject ? subject : null;
};

const isAuthenticationRequiredError = (error) => {
  const status = error?.response?.status ?? error?.status;
  const oauthError = error?.error ?? error?.code;

  return (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    ['invalid_grant', 'invalid_token', 'token_revoked'].includes(oauthError)
  );
};

const isAuthenticationCancelled = (error) =>
  ['ERR_REQUEST_CANCELED', 'ERR_CANCELED', 'access_denied'].includes(
    error?.code ?? error?.error,
  );

export default function useUtahIDProvider() {
  const [accessToken, setAccessToken, accessTokenHydrated] = useSecureRef(
    'UTAHID_ACCESS_TOKEN',
  );
  const [refreshToken, setRefreshToken, refreshTokenHydrated] = useSecureRef(
    'UTAHID_REFRESH_TOKEN',
  );
  const [idToken, setIdToken, idTokenHydrated] = useSecureRef('UTAHID_ID_TOKEN');
  const [request, , promptAsync] = useAuthRequest(
    {
      clientId: config.CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
    },
    discovery,
  );
  const [isReady, setIsReady] = React.useState(false);
  const interactivePromise = React.useRef(null);
  const refreshPromise = React.useRef(null);
  const sessionGeneration = React.useRef(0);
  const tokenWrites = React.useRef(Promise.resolve());

  React.useEffect(() => {
    if (!request) return undefined;

    let active = true;
    Promise.all([
      accessTokenHydrated,
      refreshTokenHydrated,
      idTokenHydrated,
    ]).then(() => {
      if (active) setIsReady(true);
    });

    return () => {
      active = false;
    };
  }, [
    request,
    accessTokenHydrated,
    refreshTokenHydrated,
    idTokenHydrated,
  ]);

  const waitForInitialization = async () => {
    await Promise.all([
      accessTokenHydrated,
      refreshTokenHydrated,
      idTokenHydrated,
    ]);
    if (!request) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'UtahID authentication is not initialized.',
      );
    }
  };

  const getTokens = () => {
    if (interactivePromise.current) return interactivePromise.current;

    let currentPromise;
    currentPromise = (async () => {
      await waitForInitialization();

      let response;
      try {
        response = await promptAsync({ showInRecents: true });
      } catch (error) {
        if (isAuthenticationCancelled(error)) return null;
        throw error;
      }

      if (
        ['cancel', 'dismiss'].includes(response?.type) ||
        isAuthenticationCancelled(response?.error) ||
        response?.error?.code === 'access_denied' ||
        response?.params?.error === 'access_denied'
      ) {
        return null;
      }

      if (response?.type !== 'success') {
        throw createAuthError(
          'AUTH_REQUIRED',
          'UtahID authentication did not complete successfully.',
          response?.error,
        );
      }

      const code = response.params?.code;
      if (!code) {
        throw createAuthError(
          'AUTH_REQUIRED',
          'UtahID authentication did not return an authorization code.',
        );
      }

      return exchangeCodeForToken(code);
    })().finally(() => {
      if (interactivePromise.current === currentPromise) {
        interactivePromise.current = null;
      }
    });

    interactivePromise.current = currentPromise;

    return currentPromise;
  };

  const persistTokens = (tokens, generation) => {
    const write = async () => {
      if (generation !== sessionGeneration.current) {
        throw createAuthError(
          'AUTH_REQUIRED',
          'UtahID authentication changed before credentials were saved.',
        );
      }

      await setAccessToken(tokens.accessToken ?? null);
      if (generation !== sessionGeneration.current) {
        throw createAuthError(
          'AUTH_REQUIRED',
          'UtahID authentication changed while credentials were being saved.',
        );
      }

      await setRefreshToken(tokens.refreshToken ?? null);
      if (generation !== sessionGeneration.current) {
        throw createAuthError(
          'AUTH_REQUIRED',
          'UtahID authentication changed while credentials were being saved.',
        );
      }

      await setIdToken(tokens.idToken ?? null);
      if (generation !== sessionGeneration.current) {
        throw createAuthError(
          'AUTH_REQUIRED',
          'UtahID authentication changed while credentials were being saved.',
        );
      }
    };
    const operation = tokenWrites.current.then(write);
    tokenWrites.current = operation.catch(() => {});

    return operation;
  };

  const clearTokens = async (generation) => {
    accessToken.current = null;
    refreshToken.current = null;
    idToken.current = null;
    await persistTokens({}, generation);
  };

  const logIn = async () => {
    const generation = ++sessionGeneration.current;
    await tokenWrites.current;

    const tokens = await getTokens();
    if (!tokens) return null;
    if (generation !== sessionGeneration.current) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'UtahID authentication changed while sign-in was completing.',
      );
    }

    const user = decodeToken(tokens.idToken);
    if (!user?.sub) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'UtahID did not return an authenticated account subject.',
      );
    }

    await persistTokens(tokens, generation);
    if (generation !== sessionGeneration.current) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'UtahID authentication changed while sign-in was completing.',
      );
    }

    return user;
  };

  const logOut = async () => {
    const previousTokens = {
      accessToken: accessToken.current,
      refreshToken: refreshToken.current,
      idToken: idToken.current,
    };
    const generation = ++sessionGeneration.current;
    await clearTokens(generation);

    if (previousTokens.refreshToken) {
      await revokeAsync(
        {
          clientId: config.CLIENT_ID,
          token: previousTokens.refreshToken,
        },
        discovery,
      );
    }

    if (previousTokens.accessToken && !isTokenExpiring(previousTokens.accessToken)) {
      await revokeAsync(
        {
          clientId: config.CLIENT_ID,
          token: previousTokens.accessToken,
        },
        discovery,
      );
    }

    if (previousTokens.idToken && !isTokenExpiring(previousTokens.idToken)) {
      const response = await myFetch(
        'https://login.dts.utah.gov/sso/oauth2/connect/endSession',
        {
          searchParams: {
            id_token_hint: previousTokens.idToken,
          },
        },
      );

      if (response.status !== 204) {
        console.warn('logOut: failed to end session', response.body);
      }
    }
  };

  const getBearerToken = async () => {
    await waitForInitialization();
    const generation = sessionGeneration.current;

    if (!getIdentity()) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'Sign in to UtahID to continue.',
      );
    }

    let token = accessToken.current;
    if (!token || isTokenExpiring(token)) {
      token = await refreshAccessToken();
    }

    if (
      generation !== sessionGeneration.current ||
      !token ||
      !getIdentity()
    ) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'Sign in to UtahID to continue.',
      );
    }

    return `${commonConfig.authProviderNames.utahid}:Bearer ${token}`;
  };

  const exchangeCodeForToken = async (code) => {
    return exchangeCodeAsync(
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
  };

  const refreshAccessToken = async () => {
    if (refreshPromise.current) return refreshPromise.current;

    const currentRefreshToken = refreshToken.current;
    if (!currentRefreshToken || isTokenExpiring(currentRefreshToken)) {
      const clearGeneration = ++sessionGeneration.current;
      await clearTokens(clearGeneration);
      throw createAuthError(
        'AUTH_REQUIRED',
        'Sign in to UtahID again to continue.',
      );
    }

    const generation = sessionGeneration.current;
    let currentPromise;
    currentPromise = (async () => {
      let tokenResponse;
      try {
        tokenResponse = await refreshAsync(
          {
            clientId: config.CLIENT_ID,
            refreshToken: currentRefreshToken,
          },
          discovery,
        );
      } catch (error) {
        if (generation !== sessionGeneration.current) {
          throw createAuthError(
            'AUTH_REQUIRED',
            'UtahID authentication changed while the token was renewing.',
            error,
          );
        }

        if (isAuthenticationRequiredError(error)) {
          const clearGeneration = ++sessionGeneration.current;
          await clearTokens(clearGeneration);
          throw createAuthError(
            'AUTH_REQUIRED',
            'Sign in to UtahID again to continue.',
            error,
          );
        }

        throw error;
      }

      if (generation !== sessionGeneration.current) {
        throw createAuthError(
          'AUTH_REQUIRED',
          'UtahID authentication changed while the token was renewing.',
        );
      }

      const nextTokens = {
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken ?? currentRefreshToken,
        idToken: tokenResponse.idToken ?? idToken.current,
      };
      if (!nextTokens.accessToken || !getTokenSubject(nextTokens.idToken)) {
        const clearGeneration = ++sessionGeneration.current;
        await clearTokens(clearGeneration);
        throw createAuthError(
          'AUTH_REQUIRED',
          'UtahID did not return a usable renewed session.',
        );
      }

      await persistTokens(nextTokens, generation);
      if (generation !== sessionGeneration.current) {
        throw createAuthError(
          'AUTH_REQUIRED',
          'UtahID authentication changed while the token was renewing.',
        );
      }

      return nextTokens.accessToken;
    })().finally(() => {
      if (refreshPromise.current === currentPromise) {
        refreshPromise.current = null;
      }
    });

    refreshPromise.current = currentPromise;

    return currentPromise;
  };

  const hasValidRefreshToken = () => {
    return (
      refreshToken.current && !isTokenExpiring(refreshToken.current)
    );
  };

  const getIdentity = () => getTokenSubject(idToken.current);

  return {
    logIn,
    logOut,
    getBearerToken,
    hasValidToken: hasValidRefreshToken,
    getIdentity,
    isReady: Boolean(request && isReady),
  };
}
