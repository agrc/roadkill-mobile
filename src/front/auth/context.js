import * as Sentry from '@sentry/react-native';
import { useQueryClient } from '@tanstack/react-query';
import commonConfig from 'common/config';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import propTypes from 'prop-types';
import React from 'react';
import { Alert, AppState, Platform } from 'react-native';
import config from '../services/config';
import { updateConstants } from '../services/constants';
import myFetch from '../services/fetch';
import { useSecureState } from '../services/utilities';
import useAppleProvider from './providers/apple';
import useGoogleProvider from './providers/google';
import useUtahIDProvider from './providers/utahid';

export const STATUS = {
  loading: 'loading',
  success: 'success',
  failure: 'failure',
  idle: 'idle',
};

const createAuthError = (code, message, cause) => {
  const error = new Error(message);
  error.code = code;
  if (cause) error.cause = cause;

  return error;
};

const getAuthOwner = (info) => {
  const subject = info?.oauthUser?.sub;
  if (!subject || !info?.providerName) return null;

  return {
    providerName: info.providerName,
    subject,
    userId: info.user?.id == null ? null : String(info.user.id),
  };
};

const ownersMatch = (left, right) =>
  Boolean(
    left &&
      right &&
      left.providerName === right.providerName &&
      left.subject === right.subject &&
      (!left.userId || !right.userId || left.userId === right.userId),
  );

const isCancellation = (error) =>
  error?.code === 'AUTH_CANCELLED' ||
  ['ERR_REQUEST_CANCELED', 'ERR_CANCELED', 'access_denied'].includes(
    error?.code,
  );

const isUsableAuthorization = (token) =>
  typeof token === 'string' && /^\S+:\s*Bearer\s+\S+$/i.test(token.trim());

const getProviderIdentity = (provider, fallbackSubject) =>
  typeof provider.getIdentity === 'function'
    ? provider.getIdentity()
    : fallbackSubject;

const AuthContext = React.createContext();

export function AuthContextProvider({ children, onReady }) {
  const [authInfo, setAuthInfo] = useSecureState(config.USER_STORE_KEY);
  // has the following shape:
  // {
  //    oauthUser: object as returned from the oauth request,
  //    providerName: string,
  //    user: object as returned from the login api endpoint,
  //    registered: boolean
  // }

  const [userType, setUserType] = useSecureState(
    config.USER_TYPE_KEY,
    config.USER_TYPES.public,
  );
  const authInfoRef = React.useRef(authInfo);
  if (authInfo !== undefined) authInfoRef.current = authInfo;
  const sessionGeneration = React.useRef(0);
  const tokenAcquisition = React.useRef(null);
  const authTransition = React.useRef(false);
  const explicitlySignedIn = React.useRef(false);
  const readyNotified = React.useRef(false);
  const [status, setStatus] = React.useState(STATUS.idle);
  const googleProvider = useGoogleProvider();
  const utahidProvider = useUtahIDProvider();
  const appleProvider = useAppleProvider();
  // provider should have the following shape:
  // {
  //   logIn: resolves with oauthUser object,
  //   logOut: resolves with null,
  //   getBearerToken: resolves with token
  //   hasValidToken: returns boolean (used to determine if we should send a token to logout endpoint)
  // }

  const PROVIDER_LOOKUP = {
    apple: appleProvider,
    google: googleProvider,
    utahid: utahidProvider,
  };

  let currentProvider;
  if (authInfo) {
    currentProvider = PROVIDER_LOOKUP[authInfo.providerName];
  }

  const setCurrentAuthInfo = (nextInfo) => {
    authInfoRef.current = nextInfo;
    setAuthInfo(nextInfo);
  };

  const getSessionSnapshot = () => {
    const owner = getAuthOwner(authInfoRef.current);
    if (!owner?.userId || !authInfoRef.current?.registered) return null;

    return { generation: sessionGeneration.current, owner };
  };

  const getLegacyQueueOwner = () => {
    const info = authInfoRef.current;

    return info?.previousSessionOwner ??
      (explicitlySignedIn.current ? null : getAuthOwner(info));
  };

  const isCurrentSession = (snapshot) => {
    if (!snapshot || snapshot.generation !== sessionGeneration.current) {
      return false;
    }

    return ownersMatch(snapshot.owner, getAuthOwner(authInfoRef.current));
  };

  const markRecoveryRequired = (reason, snapshot) => {
    const info = authInfoRef.current;
    if (!info?.providerName || (snapshot && !isCurrentSession(snapshot))) {
      return false;
    }
    if (info.sessionRecovery === reason) return true;

    sessionGeneration.current++;
    setCurrentAuthInfo({ ...info, sessionRecovery: reason });

    return true;
  };

  React.useEffect(() => {
    if (Platform.OS == 'ios') {
      return;
    }

    // best practice to speed up browser for android
    // ref: https://docs.expo.io/guides/authentication/#warming-the-browser
    WebBrowser.warmUpAsync();

    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  React.useEffect(() => {
    if (
      authInfo !== undefined &&
      authInfo !== null &&
      (!currentProvider || !authInfo.oauthUser?.sub)
    ) {
      authInfoRef.current = null;
      setAuthInfo(null);
    }
  }, [authInfo, currentProvider, setAuthInfo]);

  React.useEffect(() => {
    const secureStateIsHydrated = authInfo !== undefined && userType !== undefined;
    const storedAuthInfoIsValid =
      authInfo === null || Boolean(currentProvider && authInfo?.oauthUser?.sub);
    const providerIsReady =
      authInfo === null || (storedAuthInfoIsValid && currentProvider?.isReady);

    if (secureStateIsHydrated && providerIsReady && !readyNotified.current) {
      readyNotified.current = true;
      console.log('authInfo', JSON.stringify(authInfo, null, 2));
      onReady();
    }
  }, [authInfo, currentProvider, currentProvider?.isReady, onReady, userType]);

  const requestLogin = async (providerName, token, oauthUser) => {
    const loginResponse = await myFetch(
      `${config.API}/user/login`,
      {
        method: 'POST',
        json: {
          auth_id: oauthUser.sub,
          auth_provider: providerName,
          email: oauthUser.email,
          first_name: oauthUser.given_name,
          last_name: oauthUser.family_name,
        },
        headers: {
          Authorization: token,
          [commonConfig.versionHeaderName]: commonConfig.apiVersion,
        },
      },
      true,
    );

    if (loginResponse.errors) {
      throw new Error(loginResponse.errors[0].message);
    }

    return loginResponse;
  };

  const reconcileIdentity = async (providerName, token, subject) => {
    const originalInfo = authInfoRef.current;
    const originalGeneration = sessionGeneration.current;
    const previousOwner = getAuthOwner(originalInfo);
    const loginResponse = await requestLogin(providerName, token, { sub: subject });

    if (originalGeneration !== sessionGeneration.current) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'The signed-in account changed while the session was being checked.',
      );
    }

    const { user, registered, constants } = loginResponse;
    const nextInfo = {
      oauthUser: { sub: subject },
      user,
      providerName,
      registered,
      sessionRecovery: registered ? null : 'registration',
      previousSessionOwner:
        previousOwner ?? originalInfo?.previousSessionOwner,
    };

    setCurrentAuthInfo(nextInfo);
    sessionGeneration.current++;
    updateConstants(constants);

    if (!registered) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'Register this identity before accessing this resource.',
      );
    }

    return nextInfo;
  };

  const logIn = async (providerName) => {
    const provider = PROVIDER_LOOKUP[providerName];
    if (!provider) {
      throw new Error(`Unknown authentication provider: ${providerName}`);
    }

    const generation = ++sessionGeneration.current;
    authTransition.current = true;
    setStatus(STATUS.loading);

    try {
      const oauthUser = await provider.logIn();
      console.log('oauthUser', oauthUser);

      if (!oauthUser) {
        setStatus(STATUS.failure);

        return {
          success: false,
          registered: authInfoRef.current?.registered ?? false,
          cancelled: true,
        };
      }

      const token = await provider.getBearerToken();
      if (!isUsableAuthorization(token)) {
        throw createAuthError(
          'AUTH_REQUIRED',
          'The sign-in provider did not return a usable authorization token.',
        );
      }

      const subject = getProviderIdentity(provider, oauthUser.sub);
      if (!subject || generation !== sessionGeneration.current) {
        throw createAuthError(
          'AUTH_REQUIRED',
          'The signed-in identity could not be verified.',
        );
      }
      const authenticatedUser =
        oauthUser.sub === subject ? { ...oauthUser, sub: subject } : { sub: subject };
      const loginResponse = await requestLogin(
        providerName,
        token,
        authenticatedUser,
      );
      console.log('loginResponse', loginResponse);

      if (generation !== sessionGeneration.current) {
        throw createAuthError(
          'AUTH_REQUIRED',
          'The signed-in account changed while sign-in was completing.',
        );
      }

      const { user, registered, constants } = loginResponse;
      const oldInfo = authInfoRef.current;
      const oldOwner = getAuthOwner(oldInfo);

      setCurrentAuthInfo({
        oauthUser: authenticatedUser,
        user,
        providerName,
        registered,
        sessionRecovery: registered ? null : 'registration',
        previousSessionOwner:
          oldOwner ?? oldInfo?.previousSessionOwner,
      });
      explicitlySignedIn.current = true;
      sessionGeneration.current++;

      updateConstants(constants);

      setStatus(STATUS.success);

      return { success: true, registered };
    } catch (error) {
      console.log(`error logging in: ${error?.message}`);
      setStatus(STATUS.failure);

      if (isCancellation(error)) {
        return {
          success: false,
          registered: authInfoRef.current?.registered ?? false,
          cancelled: true,
        };
      }

      if (error?.code === 'AUTH_REQUIRED') {
        markRecoveryRequired('sign-in');
      } else {
        const statusCode = error?.status ?? error?.response?.status;
        const responseError = error?.data?.error;
        if (statusCode === 401 && responseError === 'invalid_token') {
          markRecoveryRequired('sign-in');
        } else if (
          statusCode === 403 &&
          responseError === 'registration_required'
        ) {
          markRecoveryRequired('registration');
        } else {
          Sentry.captureException(error);
        }
      }

      throw error;
    } finally {
      authTransition.current = false;
    }
  };

  const registerUser = async (userData) => {
    const info = authInfoRef.current;
    const generation = sessionGeneration.current;
    const token = await getBearerToken(null, {
      allowRecovery: true,
      allowUnregistered: true,
    });
    const tokenSnapshot = getSessionSnapshot();

    if (
      generation !== sessionGeneration.current ||
      !ownersMatch(getAuthOwner(info), getAuthOwner(authInfoRef.current))
    ) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'The signed-in account changed before registration completed.',
      );
    }

    let responseJson;
    try {
      responseJson = await myFetch(
        `${config.API}/user/register`,
        {
          method: 'POST',
          json: userData,
          headers: {
            Authorization: token,
            [commonConfig.versionHeaderName]: commonConfig.apiVersion,
          },
        },
        true,
      );
    } catch (error) {
      if (error.name === 'HTTPError') {
        console.error('HTTPError response', error.data ?? error.message);
      }
      handleAPIError(error, tokenSnapshot);
      throw error;
    }

    if (
      generation !== sessionGeneration.current ||
      !ownersMatch(getAuthOwner(info), getAuthOwner(authInfoRef.current))
    ) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'The signed-in account changed during registration.',
      );
    }

    setCurrentAuthInfo({
      ...authInfoRef.current,
      user: responseJson.newUser,
      registered: true,
      sessionRecovery: null,
    });
    sessionGeneration.current++;
  };

  const queryClient = useQueryClient();
  const logOut = (skipConfirm = false) => {
    return new Promise((resolve) => {
      const doLogOut = async () => {
        const info = authInfoRef.current;
        const provider = PROVIDER_LOOKUP[info?.providerName];
        sessionGeneration.current++;
        authTransition.current = true;
        setStatus(STATUS.loading);

        // no big deal if we don't have a valid token to send to the server
        // we don't want to have getBearerToken kick off the sign in flow
        // that would be confusing to users
        if (provider?.hasValidToken?.()) {
          try {
            const token = await provider.getBearerToken();
            if (!isUsableAuthorization(token)) {
              throw new Error('Provider returned an empty logout token.');
            }
            const response = await myFetch(`${config.API}/user/logout`, {
              method: 'POST',
              headers: {
                Authorization: token,
                [commonConfig.versionHeaderName]: commonConfig.apiVersion,
              },
            });

            if (response.status !== 200) {
              console.error(`logout failed: ${response.body}`);
            }
          } catch (error) {
            console.error(`logout failed: ${error.message}`);
          }
        }

        try {
          await provider?.logOut?.();
        } catch (error) {
          console.error(`provider logout failed: ${error.message}`);
        }

        setCurrentAuthInfo(null);

        await SecureStore.deleteItemAsync(config.USER_STORE_KEY);
        await SecureStore.deleteItemAsync(config.USER_TYPE_KEY);

        queryClient.clear();

        setStatus(STATUS.idle);
        authTransition.current = false;

        resolve(true);
      };

      if (skipConfirm) {
        return doLogOut();
      }

      Alert.alert(
        'Are you sure?',
        null,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Logout',
            onPress: doLogOut,
          },
        ],
        {
          cancelable: true,
          onDismiss: () => resolve(false),
        },
      );
    });
  };

  const getBearerToken = async (
    expectedSession = null,
    { allowRecovery = false, allowUnregistered = false } = {},
  ) => {
    const info = authInfoRef.current;
    const generation = sessionGeneration.current;

    if (!info?.providerName || !info?.oauthUser?.sub) {
      throw createAuthError('AUTH_REQUIRED', 'Sign in to continue.');
    }
    if (authTransition.current) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'Authentication is changing. Sign in again to continue.',
      );
    }
    if (
      info.sessionRecovery &&
      !(allowRecovery && info.sessionRecovery === 'registration')
    ) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'Sign in again before accessing this resource.',
      );
    }
    if (
      !allowUnregistered &&
      (!info.registered || !info.user?.id)
    ) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'Register this identity before accessing this resource.',
      );
    }
    if (expectedSession && !isCurrentSession(expectedSession)) {
      throw createAuthError(
        'AUTH_REQUIRED',
        'The queued submission belongs to a different sign-in session.',
      );
    }

    const pending = tokenAcquisition.current;
    if (pending?.generation === generation) {
      const token = await pending.promise;
      if (expectedSession && !isCurrentSession(expectedSession)) {
        throw createAuthError(
          'AUTH_REQUIRED',
          'The queued submission belongs to a different sign-in session.',
        );
      }

      return token;
    }

    const provider = PROVIDER_LOOKUP[info.providerName];
    if (!provider) {
      throw createAuthError('AUTH_REQUIRED', 'Sign in to continue.');
    }

    let promise;
    promise = (async () => {
      try {
        const token = await provider.getBearerToken();
        if (generation !== sessionGeneration.current) {
          throw createAuthError(
            'AUTH_REQUIRED',
            'The sign-in session changed while the token was being acquired.',
          );
        }
        if (!isUsableAuthorization(token)) {
          throw createAuthError(
            'AUTH_REQUIRED',
            'The sign-in provider did not return a usable authorization token.',
          );
        }

        const subject = getProviderIdentity(provider, info.oauthUser.sub);
        if (!subject) {
          throw createAuthError(
            'AUTH_REQUIRED',
            'The sign-in provider no longer has a verified identity.',
          );
        }

        let currentInfo = info;
        if (subject !== info.oauthUser.sub) {
          currentInfo = await reconcileIdentity(info.providerName, token, subject);
        }

        if (!allowUnregistered && (!currentInfo.registered || !currentInfo.user?.id)) {
          throw createAuthError(
            'AUTH_REQUIRED',
            'Register this identity before accessing this resource.',
          );
        }
        if (
          expectedSession &&
          (expectedSession.generation !== sessionGeneration.current ||
            !ownersMatch(expectedSession.owner, getAuthOwner(authInfoRef.current)))
        ) {
          throw createAuthError(
            'AUTH_REQUIRED',
            'The queued submission belongs to a different sign-in session.',
          );
        }

        return token;
      } catch (error) {
        const statusCode = error?.status ?? error?.response?.status;
        const responseError = error?.data?.error;
        const recoveryReason =
          statusCode === 403 && responseError === 'registration_required'
            ? 'registration'
            : statusCode === 401 && responseError === 'invalid_token'
              ? 'sign-in'
              : error?.code === 'AUTH_REQUIRED'
                ? 'sign-in'
                : null;
        if (
          recoveryReason &&
          generation === sessionGeneration.current &&
          authInfoRef.current?.providerName &&
          !authInfoRef.current.sessionRecovery
        ) {
          markRecoveryRequired(recoveryReason);
        }
        throw error;
      } finally {
        if (tokenAcquisition.current?.promise === promise) {
          tokenAcquisition.current = null;
        }
      }
    })();
    tokenAcquisition.current = { generation, promise };

    return promise;
  };

  const handleAPIError = (error, snapshot) => {
    const statusCode = error?.status ?? error?.response?.status;
    const responseError = error?.data?.error;
    if (statusCode === 401 && responseError === 'invalid_token') {
      return markRecoveryRequired('sign-in', snapshot);
    }
    if (statusCode === 403 && responseError === 'registration_required') {
      return markRecoveryRequired('registration', snapshot);
    }

    return false;
  };

  // Proactively renew the session so that a dead refresh token sends the user
  // to sign in before they start a report rather than after they submit it.
  // Network failures are ignored so that offline users keep their session.
  const verifySession = async () => {
    const info = authInfoRef.current;
    if (
      !info?.providerName ||
      !info.registered ||
      info.sessionRecovery ||
      authTransition.current
    ) {
      return !info?.sessionRecovery;
    }

    try {
      await getBearerToken();
    } catch (error) {
      if (error?.code === 'AUTH_REQUIRED') return false;

      console.log(`session check failed: ${error?.message}`);
    }

    return true;
  };
  // provider functions close over render state, so effects need the latest
  const verifySessionRef = React.useRef(verifySession);
  verifySessionRef.current = verifySession;

  const isReady =
    authInfo !== undefined &&
    userType !== undefined &&
    (authInfo === null ||
      (Boolean(authInfo?.providerName && authInfo?.oauthUser?.sub) &&
        currentProvider?.isReady));

  React.useEffect(() => {
    if (!isReady) return undefined;

    verifySessionRef.current();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') verifySessionRef.current();
    });

    return () => subscription.remove();
  }, [isReady]);

  return (
    <AuthContext.Provider
      value={{
        authInfo,
        logIn,
        logOut,
        status,
        getBearerToken,
        setUserType,
        userType,
        registerUser,
        isReady,
        getSessionSnapshot,
        getSessionOwner: () => getAuthOwner(authInfoRef.current),
        getLegacyQueueOwner,
        isSessionCurrent: isCurrentSession,
        handleAPIError,
        verifySession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
AuthContextProvider.propTypes = {
  children: propTypes.object,
  onReady: propTypes.func,
};

export default function useAuth() {
  const context = React.useContext(AuthContext);

  if (!context) {
    throw new Error('AuthContext is required');
  }

  return context;
}
