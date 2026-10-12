import commonConfig from 'common/config';
import {
  exchangeCodeAsync,
  revokeAsync,
  TokenResponse,
} from 'expo-auth-session';
import { discovery, useAuthRequest } from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import React from 'react';
import config from '../../services/config';
import myFetch from '../../services/fetch';
import { useSecureRef } from '../../services/utilities';

const GOOGLE_AUTH_KEY = 'GOOGLE_AUTHENTICATION';
const EXPIRY_MARGIN_SECONDS = 60;

const createAuthError = (code, message, cause) => {
  const error = new Error(message);
  error.code = code;
  if (cause) error.cause = cause;

  return error;
};

const getTokenResponseConfig = (authentication) => {
  if (typeof authentication?.getRequestConfig === 'function') {
    return authentication.getRequestConfig();
  }

  return {
    accessToken: authentication?.accessToken,
    refreshToken: authentication?.refreshToken,
    expiresIn: authentication?.expiresIn,
    issuedAt: authentication?.issuedAt,
    tokenType: authentication?.tokenType,
    idToken: authentication?.idToken,
    scope: authentication?.scope,
    state: authentication?.state,
  };
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

export const isAuthenticationExpired = (
  authentication,
  marginSeconds = EXPIRY_MARGIN_SECONDS,
) => {
  const expiresIn = Number(authentication?.expiresIn);
  const issuedAt = Number(authentication?.issuedAt);

  if (!Number.isFinite(expiresIn) || !Number.isFinite(issuedAt)) return true;

  return (issuedAt + expiresIn) * 1000 <= Date.now() + marginSeconds * 1000;
};

export default function useGoogleProvider() {
  const [authentication, setAuthentication, authenticationHydrated] =
    useSecureRef(GOOGLE_AUTH_KEY);
  const [request, , promptAsync] = useAuthRequest(
    {
      androidClientId:
        Constants.expoConfig.extra.GOOGLE_OAUTH_CLIENT_ID_ANDROID,
      iosClientId: Constants.expoConfig.extra.GOOGLE_OAUTH_CLIENT_ID_IOS,
      selectAccount: true,
      extraParams: { access_type: 'offline' },
      shouldAutoExchangeCode: false,
    },
    {
      path: config.OAUTH_REDIRECT_SCREEN,
    },
  );
  const [isReady, setIsReady] = React.useState(false);
  const refreshPromise = React.useRef(null);
  const interactivePromise = React.useRef(null);
  const sessionGeneration = React.useRef(0);
  const authenticationWrites = React.useRef(Promise.resolve());

  React.useEffect(() => {
    if (!request) return undefined;

    let active = true;
    Promise.resolve(authenticationHydrated).then(() => {
      if (active) setIsReady(true);
    });

    return () => {
      active = false;
    };
  }, [request, authenticationHydrated]);

  const waitForInitialization = async () => {
    await authenticationHydrated;
    if (!request) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'Google authentication is not initialized.',
      );
    }
  };

  const getAuthentication = () => {
    if (interactivePromise.current) return interactivePromise.current;

    let currentPromise;
    currentPromise = (async () => {
      await waitForInitialization();
      let promptResponse;
      try {
        promptResponse = await promptAsync();
      } catch (error) {
        if (['ERR_REQUEST_CANCELED', 'ERR_CANCELED'].includes(error?.code)) {
          return null;
        }
        throw error;
      }

      if (
        ['cancel', 'dismiss'].includes(promptResponse?.type) ||
        promptResponse?.error?.code === 'access_denied' ||
        promptResponse?.params?.error === 'access_denied'
      ) {
        return null;
      }

      if (promptResponse?.type !== 'success') {
        throw createAuthError(
          'AUTH_REQUIRED',
          'Google authentication did not complete successfully.',
          promptResponse?.error,
        );
      }

      if (promptResponse.authentication?.accessToken) {
        return promptResponse.authentication;
      }

      const code = promptResponse.params?.code;
      if (!code) {
        throw createAuthError(
          'AUTH_REQUIRED',
          'Google authentication did not return an authorization code.',
        );
      }

      return exchangeCodeAsync(
        {
          clientId: request.clientId,
          code,
          redirectUri: request.redirectUri,
          extraParams: { code_verifier: request.codeVerifier ?? '' },
        },
        discovery,
      );
    })().finally(() => {
      if (interactivePromise.current === currentPromise) {
        interactivePromise.current = null;
      }
    });

    interactivePromise.current = currentPromise;

    return currentPromise;
  };

  const getUserInfo = async (accessToken) => {
    const user = await myFetch(
      'https://openidconnect.googleapis.com/v1/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      true,
    );

    if (typeof user?.sub !== 'string' || !user.sub) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'Google did not return a verified account subject.',
      );
    }

    return user;
  };

  const writeAuthentication = (nextAuthentication, generation) => {
    const write = async () => {
      if (generation !== sessionGeneration.current) {
        throw createAuthError(
          'AUTH_REQUIRED',
          'Google authentication changed before credentials were saved.',
        );
      }

      await setAuthentication(nextAuthentication);

      if (generation !== sessionGeneration.current) {
        throw createAuthError(
          'AUTH_REQUIRED',
          'Google authentication changed while credentials were being saved.',
        );
      }
    };
    const operation = authenticationWrites.current.then(write);
    authenticationWrites.current = operation.catch(() => {});

    return operation;
  };

  const persistAuthentication = async (tokenResponse, subject, generation) => {
    const nextAuthentication = {
      ...getTokenResponseConfig(tokenResponse),
      subject,
    };

    if (!nextAuthentication.accessToken || !subject) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'Google authentication is missing a usable account or access token.',
      );
    }

    await writeAuthentication(nextAuthentication, generation);
    if (generation !== sessionGeneration.current) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'Google authentication changed while sign-in was completing.',
      );
    }

    return nextAuthentication;
  };

  const refreshAuthentication = () => {
    if (refreshPromise.current) return refreshPromise.current;

    const current = authentication.current;
    if (!current?.refreshToken) {
      return Promise.reject(
        createAuthError(
          'AUTH_REQUIRED',
          'Sign in to Google again to continue.',
        ),
      );
    }

    const generation = sessionGeneration.current;
    let currentPromise;
    currentPromise = (async () => {
      try {
        const tokenResponse = await new TokenResponse(
          getTokenResponseConfig(current),
        ).refreshAsync({ clientId: request.clientId }, discovery);
        const tokenConfig = getTokenResponseConfig(tokenResponse);
        const user = await getUserInfo(tokenConfig.accessToken);

        if (generation !== sessionGeneration.current) {
          throw createAuthError(
            'AUTH_REQUIRED',
            'Google authentication changed while the token was renewing.',
          );
        }

        tokenConfig.refreshToken =
          tokenConfig.refreshToken ?? current.refreshToken;
        return await persistAuthentication(tokenConfig, user.sub, generation);
      } catch (error) {
        if (generation !== sessionGeneration.current) {
          throw createAuthError(
            'AUTH_REQUIRED',
            'Google authentication changed while the token was renewing.',
            error,
          );
        }

        if (isAuthenticationRequiredError(error)) {
          const clearGeneration = ++sessionGeneration.current;
          authentication.current = null;
          await writeAuthentication(null, clearGeneration);
          throw createAuthError(
            'AUTH_REQUIRED',
            'Sign in to Google again to continue.',
            error,
          );
        }

        throw error;
      }
    })().finally(() => {
      if (refreshPromise.current === currentPromise) {
        refreshPromise.current = null;
      }
    });

    refreshPromise.current = currentPromise;

    return currentPromise;
  };

  const logIn = async () => {
    const generation = ++sessionGeneration.current;
    await authenticationWrites.current;

    const tokenResponse = await getAuthentication();
    if (!tokenResponse) return null;

    const user = await getUserInfo(tokenResponse.accessToken);

    if (generation !== sessionGeneration.current) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'Google authentication changed while sign-in was completing.',
      );
    }

    await persistAuthentication(tokenResponse, user.sub, generation);
    if (generation !== sessionGeneration.current) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'Google authentication changed while sign-in was completing.',
      );
    }

    return user;
  };

  const logOut = async () => {
    const previousAuthentication = authentication.current;
    const generation = ++sessionGeneration.current;
    authentication.current = null;
    await writeAuthentication(null, generation);

    if (previousAuthentication?.accessToken) {
      await revokeAsync(
        { token: previousAuthentication.accessToken },
        discovery,
      );
    }
  };

  const getBearerToken = async () => {
    await waitForInitialization();
    const generation = sessionGeneration.current;

    let current = authentication.current;
    if (
      generation !== sessionGeneration.current ||
      !current?.accessToken ||
      !current.subject
    ) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'Sign in to Google to continue.',
      );
    }

    if (isAuthenticationExpired(current)) {
      current = await refreshAuthentication();
    }

    if (
      generation !== sessionGeneration.current ||
      !current?.accessToken ||
      !current.subject
    ) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'Sign in to Google to continue.',
      );
    }

    return `${commonConfig.authProviderNames.google}:Bearer ${current.accessToken}`;
  };

  const hasValidToken = () =>
    Boolean(
      authentication.current?.accessToken &&
        authentication.current.subject &&
        !isAuthenticationExpired(authentication.current),
    );

  const getIdentity = () => authentication.current?.subject ?? null;

  return {
    logIn,
    logOut,
    getBearerToken,
    hasValidToken,
    getIdentity,
    isReady: Boolean(request && isReady),
  };
}
