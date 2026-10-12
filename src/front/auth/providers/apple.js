import commonConfig from 'common/config';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import React from 'react';
import config from '../../services/config';
import myFetch from '../../services/fetch';

const STORE_KEY = 'roadkill-apple-user-info';
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
const appleOptions = {
  requestedScopes: [
    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    AppleAuthentication.AppleAuthenticationScope.EMAIL,
  ],
};

function getIdentityTokenClaims(identityToken) {
  if (typeof identityToken !== 'string') return null;

  try {
    const claims = jwtDecode(identityToken);
    if (typeof claims.sub !== 'string' || !Number.isFinite(claims.exp)) {
      return null;
    }

    return claims;
  } catch {
    return null;
  }
}

function createAuthError(code, message, cause) {
  const error = new Error(message);
  error.code = code;
  if (cause) error.cause = cause;

  return error;
}

function isCancelled(error) {
  return ['ERR_REQUEST_CANCELED', 'AUTH_CANCELLED'].includes(error?.code);
}

function toOAuthUser(userInfo) {
  return {
    sub: userInfo.sub,
    email: userInfo.email,
    given_name: userInfo.given_name,
    family_name: userInfo.family_name,
  };
}

export default function useAppleProvider() {
  const cachedUserInfo = React.useRef(null);
  const sessionGeneration = React.useRef(0);
  const refreshPromise = React.useRef(null);
  const secureStoreWrites = React.useRef(Promise.resolve());
  const [isReady, setIsReady] = React.useState(false);

  const getCachedUserInfo = React.useCallback(async () => {
    const stringValue = await SecureStore.getItemAsync(STORE_KEY);
    if (!stringValue) return null;

    try {
      const userInfo = JSON.parse(stringValue);

      return userInfo &&
        typeof userInfo === 'object' &&
        !Array.isArray(userInfo)
        ? userInfo
        : null;
    } catch {
      return null;
    }
  }, []);

  const persistUserInfo = React.useCallback(
    (userInfo, generation, updateCache = true) => {
      const write = async () => {
        if (generation !== sessionGeneration.current) {
          throw createAuthError(
            'AUTH_REQUIRED',
            'Apple authentication changed before credentials were saved.',
          );
        }

        await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(userInfo));

        if (generation !== sessionGeneration.current) {
          throw createAuthError(
            'AUTH_REQUIRED',
            'Apple authentication changed while credentials were being saved.',
          );
        }

        if (updateCache) cachedUserInfo.current = userInfo;

        return userInfo;
      };
      const operation = secureStoreWrites.current.then(write);
      secureStoreWrites.current = operation.catch(() => {});

      return operation;
    },
    [],
  );

  const refreshToken = React.useCallback(
    (identityToken, authorizationCode, generation) => {
      const pendingRefresh = refreshPromise.current;
      if (
        pendingRefresh?.generation === generation &&
        pendingRefresh.identityToken === identityToken
      ) {
        return pendingRefresh.promise;
      }

      const currentUserInfo = cachedUserInfo.current;
      const claims = getIdentityTokenClaims(identityToken);
      if (
        generation !== sessionGeneration.current ||
        !currentUserInfo?.sub ||
        !claims ||
        claims.sub !== currentUserInfo.sub ||
        claims.exp * 1000 <= Date.now()
      ) {
        return Promise.reject(
          createAuthError(
            'AUTH_REQUIRED',
            'A valid Apple sign-in is required.',
          ),
        );
      }

      const payload = { identityToken };
      if (authorizationCode) payload.authorizationCode = authorizationCode;

      const operation = (async () => {
        let refreshResult;
        try {
          refreshResult = await myFetch(
            `${config.API}/user/apple-token`,
            {
              method: 'POST',
              json: payload,
            },
            true,
          );
        } catch (error) {
          if (
            generation !== sessionGeneration.current ||
            cachedUserInfo.current?.sub !== currentUserInfo.sub
          ) {
            throw createAuthError(
              'AUTH_REQUIRED',
              'Apple authentication changed while the token was renewing.',
              error,
            );
          }
          if (error?.response?.status === 401) {
            throw createAuthError(
              'AUTH_REQUIRED',
              'A valid Apple sign-in is required.',
              error,
            );
          }

          throw error;
        }

        if (
          generation !== sessionGeneration.current ||
          cachedUserInfo.current?.sub !== currentUserInfo.sub
        ) {
          throw createAuthError(
            'AUTH_REQUIRED',
            'Apple authentication changed while the token was renewing.',
          );
        }

        const refreshedToken = refreshResult?.identityToken;
        const refreshedClaims = getIdentityTokenClaims(refreshedToken);
        if (
          !refreshedClaims ||
          refreshedClaims.sub !== currentUserInfo.sub ||
          refreshedClaims.exp * 1000 <= Date.now() + REFRESH_MARGIN_MS
        ) {
          throw createAuthError(
            'AUTH_REQUIRED',
            'Apple did not return a usable identity token.',
          );
        }

        const updatedUserInfo = {
          ...currentUserInfo,
          identityToken: refreshedToken,
        };
        await persistUserInfo(updatedUserInfo, generation);
        if (generation !== sessionGeneration.current) {
          throw createAuthError(
            'AUTH_REQUIRED',
            'Apple authentication changed while the token was renewing.',
          );
        }

        return refreshedToken;
      })();
      const pending = { generation, identityToken, promise: null };
      pending.promise = operation.finally(() => {
        if (refreshPromise.current === pending) refreshPromise.current = null;
      });
      refreshPromise.current = pending;

      return pending.promise;
    },
    [persistUserInfo],
  );

  React.useEffect(() => {
    let isActive = true;
    const initialize = async () => {
      const generation = sessionGeneration.current;
      try {
        const hydratedUserInfo = await getCachedUserInfo();
        if (generation !== sessionGeneration.current) return;

        cachedUserInfo.current = hydratedUserInfo;

        const claims = getIdentityTokenClaims(
          cachedUserInfo.current?.identityToken,
        );
        if (
          claims &&
          claims.sub === cachedUserInfo.current?.sub &&
          claims.exp * 1000 > Date.now() &&
          claims.exp * 1000 <= Date.now() + REFRESH_MARGIN_MS
        ) {
          await refreshToken(
            cachedUserInfo.current.identityToken,
            undefined,
            generation,
          );
        }
      } catch (error) {
        console.error('Apple provider initialization failed', error);
      } finally {
        if (isActive) setIsReady(true);
      }
    };

    void initialize();

    return () => {
      isActive = false;
    };
  }, [getCachedUserInfo, refreshToken]);

  const logIn = async () => {
    const generation = ++sessionGeneration.current;
    await secureStoreWrites.current;
    if (generation !== sessionGeneration.current) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'Apple authentication changed while sign-in was starting.',
      );
    }

    const currentUserInfo = cachedUserInfo.current;
    const claims = getIdentityTokenClaims(currentUserInfo?.identityToken);
    const hasUsableToken =
      claims &&
      claims.sub === currentUserInfo?.sub &&
      claims.exp * 1000 > Date.now();

    if (hasUsableToken) {
      if (claims.exp * 1000 > Date.now() + REFRESH_MARGIN_MS) {
        return toOAuthUser(currentUserInfo);
      }

      try {
        await refreshToken(currentUserInfo.identityToken, undefined, generation);
        if (generation !== sessionGeneration.current) {
          throw createAuthError(
            'AUTH_REQUIRED',
            'Apple authentication changed while sign-in was completing.',
          );
        }

        return toOAuthUser(cachedUserInfo.current);
      } catch (error) {
        if (generation !== sessionGeneration.current) {
          throw createAuthError(
            'AUTH_REQUIRED',
            'Apple authentication changed while sign-in was completing.',
            error,
          );
        }
        if (error.code === 'AUTH_CANCELLED') return null;
        if (error.code !== 'AUTH_REQUIRED') throw error;

        let refreshedCredentials;
        try {
          refreshedCredentials = await AppleAuthentication.refreshAsync({
            ...appleOptions,
            user: currentUserInfo.sub,
          });
        } catch (recoveryError) {
          if (isCancelled(recoveryError)) {
            return null;
          }
          throw recoveryError;
        }

        if (generation !== sessionGeneration.current) {
          throw createAuthError(
            'AUTH_REQUIRED',
            'Apple authentication changed while sign-in was completing.',
          );
        }

        const refreshedClaims = getIdentityTokenClaims(
          refreshedCredentials?.identityToken,
        );
        if (
          refreshedCredentials?.user !== currentUserInfo.sub ||
          !refreshedClaims ||
          refreshedClaims.sub !== currentUserInfo.sub ||
          refreshedClaims.exp * 1000 <= Date.now()
        ) {
          throw createAuthError(
            'AUTH_REQUIRED',
            'A valid Apple sign-in is required.',
          );
        }

        await refreshToken(
          refreshedCredentials.identityToken,
          refreshedCredentials.authorizationCode,
          generation,
        );
        if (generation !== sessionGeneration.current) {
          throw createAuthError(
            'AUTH_REQUIRED',
            'Apple authentication changed while sign-in was completing.',
          );
        }

        return toOAuthUser(cachedUserInfo.current);
      }
    }

    let signInResult;
    try {
      signInResult = await AppleAuthentication.signInAsync(appleOptions);
    } catch (error) {
      if (isCancelled(error)) {
        return null;
      }
      throw error;
    }
    if (generation !== sessionGeneration.current) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'Apple authentication changed while sign-in was completing.',
      );
    }
    if (!signInResult?.user || !signInResult.identityToken) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'Apple did not return valid sign-in credentials.',
      );
    }

    const existingUserInfo =
      currentUserInfo?.sub === signInResult.user ? currentUserInfo : null;
    const updatedUserInfo = {
      sub: signInResult.user,
      email: signInResult.email || existingUserInfo?.email,
      given_name:
        signInResult.fullName?.givenName || existingUserInfo?.given_name,
      family_name:
        signInResult.fullName?.familyName || existingUserInfo?.family_name,
      identityToken: null,
    };
    const signInClaims = getIdentityTokenClaims(signInResult.identityToken);
    if (
      signInClaims?.sub !== signInResult.user ||
      signInClaims.exp * 1000 <= Date.now()
    ) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'Apple returned an invalid identity token.',
      );
    }

    await persistUserInfo(updatedUserInfo, generation);
    await refreshToken(
      signInResult.identityToken,
      signInResult.authorizationCode,
      generation,
    );
    if (generation !== sessionGeneration.current) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'Apple authentication changed while sign-in was completing.',
      );
    }

    return toOAuthUser(cachedUserInfo.current);
  };

  const logOut = async () => {
    const generation = ++sessionGeneration.current;
    const currentUserInfo = cachedUserInfo.current;
    const storedUserInfo = currentUserInfo
      ? { ...currentUserInfo, identityToken: null }
      : null;
    cachedUserInfo.current = null;
    await persistUserInfo(storedUserInfo, generation, false);
  };

  const getBearerToken = async () => {
    const generation = sessionGeneration.current;
    const prefix = `${commonConfig.authProviderNames.apple}:Bearer `;
    const userInfo = cachedUserInfo.current;
    const claims = getIdentityTokenClaims(userInfo?.identityToken);
    if (
      !claims ||
      claims.sub !== userInfo?.sub ||
      claims.exp * 1000 <= Date.now()
    ) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'A valid Apple sign-in is required.',
      );
    }

    if (claims.exp * 1000 <= Date.now() + REFRESH_MARGIN_MS) {
      const refreshedToken = await refreshToken(
        userInfo.identityToken,
        undefined,
        generation,
      );

      if (generation !== sessionGeneration.current) {
        throw createAuthError(
          'AUTH_REQUIRED',
          'Apple authentication changed while the token was renewing.',
        );
      }

      return prefix + refreshedToken;
    }

    return prefix + userInfo.identityToken;
  };

  const hasValidToken = () => {
    const userInfo = cachedUserInfo.current;
    const claims = getIdentityTokenClaims(userInfo?.identityToken);

    return (
      !!claims && claims.sub === userInfo?.sub && claims.exp * 1000 > Date.now()
    );
  };

  const getIdentity = () => {
    const userInfo = cachedUserInfo.current;
    const claims = getIdentityTokenClaims(userInfo?.identityToken);

    return claims &&
      claims.sub === userInfo?.sub &&
      claims.exp * 1000 > Date.now()
      ? userInfo.sub
      : null;
  };

  return {
    logIn,
    logOut,
    getBearerToken,
    hasValidToken,
    getIdentity,
    isReady,
  };
}
