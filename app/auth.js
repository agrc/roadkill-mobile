import * as React from 'react';
import {
  makeRedirectUri,
  useAuthRequest,
  exchangeCodeAsync,
  refreshAsync,
  dismiss
} from "expo-auth-session";
import jwt_decode from 'jwt-decode';
import * as SecureStore from 'expo-secure-store';

const CLIENT_ID = process.env.CLIENT_ID;
const API = process.env.API;
const STORE_KEY = 'WVC_Auth_Refresh_Token';
const redirectUri = makeRedirectUri({ scheme: "wvc" });
const discovery = {
  authorizationEndpoint: "https://login.dts.utah.gov:443/sso/oauth2/authorize",
  tokenEndpoint: `${API}/token`,
  revocationEndpoint: "https://login.dts.utah.gov:443/sso/oauth2/token/revoke"
};
console.log('discovery.tokenEndpoint', discovery.tokenEndpoint);

function isTokenExpired(token) {
  const expireTime = jwt_decode(token).exp * 1000;

  return expireTime < new Date().getTime();
}

export default function useAuth() {
  // should these be kept in secure story rather than in-memory?
  const accessToken = React.useRef(null);
  const refreshToken = React.useRef(null);
  const [userInfo, setUserInfo] = React.useState(null);
  const [status, setStatus] = React.useState('idle');

  React.useEffect(() => {
    console.log('getting cached token');
    SecureStore.getItemAsync(STORE_KEY).then(cachedToken => {
      console.log('cachedToken', cachedToken);
      if (cachedToken) {
        refreshToken.current = cachedToken;
        refreshAccessToken();
      }
    })
  }, []);

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: ["openid", "profile", "email"],
      redirectUri,
    },
    discovery
  );

  const logIn = () => {
    setStatus('pending');
    promptAsync();
  }

  const logOut = () => {
    setStatus('pending');
    dismiss();

    // TODO: check if successful
    setStatus('idle');
    setUserInfo(null);
    accessToken.current = null;
    refreshToken.current = null;
    SecureStore.setItemAsync(STORE_KEY, '');
  };

  const getAccessToken = async () => {
    // TODO: do I need to worry about handling the case of this function
    // being called before the we have valid access or refresh tokens?
    console.log('getAccessToken');
    if (accessToken.current && !isTokenExpired(accessToken.current)) {
      return accessToken.current;
    }

    return await refreshAccessToken();
  };

  React.useEffect(() => {
    if (response?.type === "success") {
      console.log(response);
      exchangeCodeForToken();
    }
  }, [response?.type]);

  const exchangeCodeForToken = async () => {
    console.log('exchangeCodeForToken');
    setStatus('pending');

    const tokenResponse = await exchangeCodeAsync(
      {
        clientId: CLIENT_ID,
        code: response.params.code,
        redirectUri,
        extraParams: {
          code_verifier: request.codeVerifier,
          code_challenge: request.codeChallenge
        }
      },
      discovery
    );

    setStatus('resolved');
    accessToken.current = tokenResponse.accessToken;
    refreshToken.current = tokenResponse.refreshToken;
    setUserInfo(jwt_decode(tokenResponse.idToken));

    console.log('setting cached token');
    SecureStore.setItemAsync(STORE_KEY, tokenResponse.refreshToken);
    // TODO: add possibly cache the access token?

    return tokenResponse.accessToken;
  };

  const refreshAccessToken = async () => {
    console.log('refreshAccessToken');
    setStatus('pending');

    if (refreshToken.current && isTokenExpired(refreshToken.current)) {
      throw new Error('TODO? How to refresh old refresh token. They last for 12 hours');
    }

    try {
      const tokenResponse = await refreshAsync(
        {
          clientId: CLIENT_ID,
          refreshToken: refreshToken.current,
          redirectUri
        },
        discovery
      );

      setStatus('resolved');
      accessToken.current = tokenResponse.accessToken;
      if (!userInfo) {
        setUserInfo(jwt_decode(tokenResponse.idToken));
      }

      return tokenResponse.accessToken;
    } catch (error) {
      console.error(error);
      setStatus('rejected');

      return null;
    }
  };


  return {userInfo, getAccessToken, logIn, logOut, status};
}
