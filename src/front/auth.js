import * as React from 'react';
import { makeRedirectUri, AuthRequest, exchangeCodeAsync, refreshAsync, dismiss } from 'expo-auth-session';
import jwt_decode from 'jwt-decode';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import config from './config';
import { Platform } from 'react-native';

const STORE_KEY = 'WVC_Auth_Refresh_Token';
let redirectUri = `${makeRedirectUri({ scheme: config.SCHEME })}`;
if (__DEV__) {
  redirectUri += Platform.OS === 'android' ? '/--/' : '/';
}
redirectUri += 'main';

const discovery = {
  authorizationEndpoint: 'https://login.dts.utah.gov:443/sso/oauth2/authorize',
  tokenEndpoint: `${config.API}/token`,
  revocationEndpoint: 'https://login.dts.utah.gov:443/sso/oauth2/token/revoke',
};

function isTokenExpired(token) {
  const expireTime = jwt_decode(token).exp * 1000;

  return expireTime < new Date().getTime();
}
const request = new AuthRequest({
  clientId: config.CLIENT_ID,
  scopes: ['openid', 'profile', 'email'],
  redirectUri,
});

export default function useAuth() {
  // should these be kept in secure store rather than in-memory?
  const accessToken = React.useRef(null);
  const refreshToken = React.useRef(null);
  const [userInfo, setUserInfo] = React.useState(null);
  const [status, setStatus] = React.useState('idle');

  // best practice to speed up browser for android
  // ref: https://docs.expo.io/guides/authentication/#warming-the-browser
  React.useEffect(() => {
    WebBrowser.warmUpAsync();

    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  React.useEffect(() => {
    console.log('getting cached token');
    SecureStore.getItemAsync(STORE_KEY).then((cachedRefreshToken) => {
      if (cachedRefreshToken) {
        refreshToken.current = cachedRefreshToken;
        refreshAccessToken();
      }
    });
  }, []);

  const logIn = async () => {
    setStatus('pending');
    try {
      // TODO: prevent this method from being called multiple times in a row
      const result = await request.promptAsync(discovery);

      if (result?.type === 'success') {
        await exchangeCodeForToken(result.params.code);
      } else {
        setStatus('rejected');
        throw new Error(JSON.stringify(result));
      }
    } catch (error) {
      setStatus('rejected');
      throw error;
    }
  };

  const logOut = () => {
    setStatus('pending');

    setStatus('idle');
    setUserInfo(null);
    accessToken.current = null;
    refreshToken.current = null;
    SecureStore.setItemAsync(STORE_KEY, '');

    dismiss();
    // TODO: I don't think that this is logging out of the browser
    // this throws an error in expo go on android but supposedly not in built app
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
    setStatus('pending');

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
      setStatus('rejected');
      throw error;
    }

    setStatus('resolved');
    accessToken.current = tokenResponse.accessToken;
    refreshToken.current = tokenResponse.refreshToken;
    setUserInfo(jwt_decode(tokenResponse.idToken));
    console.log('userInfo', jwt_decode(tokenResponse.idToken));

    console.log('setting cached token');
    SecureStore.setItemAsync(STORE_KEY, refreshToken.current);

    return tokenResponse.accessToken;
  };

  const refreshAccessToken = async () => {
    console.log('refreshAccessToken');
    setStatus('pending');

    if (!refreshToken.current || isTokenExpired(refreshToken.current)) {
      await logIn();
    }

    try {
      const tokenResponse = await refreshAsync(
        {
          clientId: config.CLIENT_ID,
          refreshToken: refreshToken.current,
        },
        discovery
      );

      setStatus('resolved');
      accessToken.current = tokenResponse.accessToken;
      if (!userInfo) {
        setUserInfo(jwt_decode(tokenResponse.idToken));
        console.log('userInfo', jwt_decode(tokenResponse.idToken));
      }

      return tokenResponse.accessToken;
    } catch (error) {
      console.error(error);
      setStatus('rejected');

      return null;
    }
  };

  return { userInfo, getAccessToken, logIn, logOut, status, redirectUri };
}
