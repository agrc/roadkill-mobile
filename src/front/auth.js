import * as React from 'react';
import { makeRedirectUri, useAuthRequest, exchangeCodeAsync, refreshAsync } from 'expo-auth-session';
import jwt_decode from 'jwt-decode';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import config from './config';
import propTypes from 'prop-types';
import { useMounted } from './utilities';

const STORE_KEY = 'WVC_Auth_Refresh_Token';
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

export const STATUS = {
  loading: 'loading',
  success: 'success',
  failure: 'failure',
  idle: 'idle',
};

WebBrowser.maybeCompleteAuthSession();

function isTokenExpired(token) {
  const expireTime = jwt_decode(token).exp * 1000;

  return expireTime < new Date().getTime();
}

const AuthContext = React.createContext();

export function AuthContextProvider({ children, setReady }) {
  // should these be kept in secure store rather than in-memory?
  const accessToken = React.useRef(null);
  const refreshToken = React.useRef(null);
  const [userInfo, setUserInfo] = React.useState(null);
  const [status, setStatus] = React.useState(STATUS.idle);
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: config.CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
    },
    discovery
  );
  const isMounted = useMounted();
  console.log('status', status);

  // best practice to speed up browser for android
  // ref: https://docs.expo.io/guides/authentication/#warming-the-browser
  React.useEffect(() => {
    WebBrowser.warmUpAsync();

    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  React.useEffect(() => {
    const prepare = async () => {
      try {
        const cachedRefreshToken = await SecureStore.getItemAsync(STORE_KEY);

        if (cachedRefreshToken && !isTokenExpired(cachedRefreshToken)) {
          refreshToken.current = cachedRefreshToken;

          await refreshAccessToken();
        }
      } catch (error) {
        console.warn('error with auth prepare function', error);
      } finally {
        setReady(true);
      }
    };

    prepare();
  }, []);

  const logIn = async () => {
    console.log('logIn');
    setStatus(STATUS.loading);
    try {
      await promptAsync();
    } catch (error) {
      setStatus(STATUS.failure);
      throw error;
    }
  };

  React.useEffect(() => {
    if (!response) return;

    if (response?.type === 'success' && !accessToken.current) {
      exchangeCodeForToken(response.params.code);
    } else {
      setStatus(STATUS.failure);
      throw new Error(JSON.stringify(response));
    }
  }, [response]);

  const logOut = () => {
    setStatus(STATUS.loading);

    setUserInfo(null);
    accessToken.current = null;
    refreshToken.current = null;
    SecureStore.setItemAsync(STORE_KEY, '');

    setStatus(STATUS.idle);
    // TODO: I don't think that this is logging out of the browser, do we care?
  };

  const getAccessToken = async () => {
    console.log('getAccessToken');

    const prefix = 'Bearer ';
    if (accessToken.current && !isTokenExpired(accessToken.current)) {
      return prefix + accessToken.current;
    }

    return prefix + (await refreshAccessToken());
  };

  const exchangeCodeForToken = async (code) => {
    console.log('exchangeCodeForToken');

    let tokenResponse;
    try {
      tokenResponse = await exchangeCodeAsync(
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
    } catch (error) {
      if (isMounted) {
        setStatus(STATUS.failure);
        throw error;
      }
    }

    if (isMounted) {
      setStatus(STATUS.success);
      accessToken.current = tokenResponse.accessToken;
      refreshToken.current = tokenResponse.refreshToken;
      setUserInfo(jwt_decode(tokenResponse.idToken));
      // console.log('userInfo', jwt_decode(tokenResponse.idToken));

      console.log('setting cached token');
      SecureStore.setItemAsync(STORE_KEY, refreshToken.current);
    }
  };

  const refreshAccessToken = async () => {
    console.log('refreshAccessToken');
    setStatus(STATUS.loading);

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
      if (!userInfo) {
        setUserInfo(jwt_decode(tokenResponse.idToken));
        // console.log('userInfo', jwt_decode(tokenResponse.idToken));
      }
      setStatus(STATUS.success);

      return tokenResponse.accessToken;
    } catch (error) {
      console.error(error);
      setStatus(STATUS.failure);

      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ userInfo, getAccessToken, logIn, logOut, status }}>{children}</AuthContext.Provider>
  );
}
AuthContextProvider.propTypes = {
  children: propTypes.object,
  setReady: propTypes.func,
};

export default function useAuth() {
  return React.useContext(AuthContext);
}
