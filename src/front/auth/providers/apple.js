import commonConfig from 'common/config';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as SecureStore from 'expo-secure-store';
import jwt_decode from 'jwt-decode';
import ky from 'ky';
import React from 'react';
import config from '../../services/config';
import { isTokenExpired, useAsyncError } from '../../services/utilities';

const STORE_KEY = 'roadkill-apple-user-info';
const appleOptions = {
  requestedScopes: [
    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    AppleAuthentication.AppleAuthenticationScope.EMAIL,
  ],
};

export default function useAppleProvider() {
  const throwAsyncError = useAsyncError();
  const cachedUserInfo = React.useRef(null);

  const refreshToken = async (identityToken, authorizationCode, isRetry) => {
    console.log('refreshing apple token');
    let refreshResult;
    const payload = { identityToken };
    if (authorizationCode) {
      payload.authorizationCode = authorizationCode;
    }
    try {
      refreshResult = await ky
        .post(`${config.API}/user/apple-token`, {
          json: payload,
          timeout: config.API_REQUEST_TIMEOUT,
        })
        .json();
    } catch (error) {
      if (error.response.status === 401 && !isRetry) {
        console.log('refresh token failed, refresh credentials');
        const refreshedCredentials = await AppleAuthentication.refreshAsync(appleOptions);

        return await refreshToken(refreshedCredentials.identityToken, refreshedCredentials.authorizationCode, true);
      }
    }

    console.log('refreshResult', JSON.stringify(refreshResult, null, 2));

    cachedUserInfo.current.identityToken = refreshResult.identityToken;
  };

  React.useEffect(() => {
    const giddyUp = async () => {
      const cachedUserInfoString = await SecureStore.getItemAsync(STORE_KEY);
      cachedUserInfo.current = cachedUserInfoString ? JSON.parse(cachedUserInfoString) : null;

      // because there is no way to know if this token is valid on the server
      if (cachedUserInfo.current) {
        await refreshToken(cachedUserInfo.current.identityToken);
      }
    };

    giddyUp();
  }, []);

  const logIn = async () => {
    console.log('apple logIn');
    if (cachedUserInfo.current?.identityToken && !isTokenExpired(jwt_decode(cachedUserInfo.current.identityToken))) {
      return cachedUserInfo.current;
    }

    let signInResult;
    try {
      signInResult = await AppleAuthentication.signInAsync(appleOptions);
    } catch (error) {
      if (error.code === 'ERR_CANCELED') {
        return null;
      } else {
        throwAsyncError(error);
      }
    }
    console.log('signInResult', signInResult);
    // auth shape:
    // {
    //   authorizationCode: string,
    //   email: string, (could be forward email, but should work either way),
    //   fullName: {
    //     familyName: string,
    //     givenName: string,
    //     ...
    //   },
    //   identityToken: string,
    //   realUserStatus: number, (2 - real user),
    //   state: null,
    //   user: string, (user id)
    // }
    if (!signInResult) {
      return null;
    }

    // this returns a 1 when running in the dev client on my real device, not sure how helpful this is
    // Ref: https://developer.apple.com/documentation/authenticationservices/asuserdetectionstatus
    // if (signInResult?.realUserStatus !== 2) {
    //   throwAsyncError(new Error('Not a real user'));
    // }

    if (!signInResult.email && cachedUserInfo.current) {
      signInResult.email = cachedUserInfo.current.email;
      signInResult.fullName.givenName = cachedUserInfo.current.given_name;
      signInResult.fullName.familyName = cachedUserInfo.current.family_name;
    }

    // we only get email, and names on the first sign in, so cache them locally
    // user is sent every time
    cachedUserInfo.current = {
      sub: signInResult.user,
      email: signInResult.email,
      given_name: signInResult.fullName.givenName,
      family_name: signInResult.fullName.familyName,
      identityToken: signInResult.identityToken,
    };
    await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(cachedUserInfo.current));

    await refreshToken(signInResult.identityToken, signInResult.authorizationCode);

    return {
      sub: signInResult.user,
      email: signInResult.email,
      given_name: signInResult.fullName.givenName,
      family_name: signInResult.fullName.familyName,
    };
  };

  const logOut = async () => {
    cachedUserInfo.current = null;
    await SecureStore.deleteItemAsync(STORE_KEY);
  };

  const getBearerToken = async () => {
    const prefix = `${commonConfig.authProviderNames.apple}:Bearer `;

    if (isTokenExpired(jwt_decode(cachedUserInfo.current.identityToken))) {
      console.log('refreshing token');

      await refreshToken(cachedUserInfo.current.identityToken);
    }

    return prefix + cachedUserInfo.current.identityToken;
  };

  return { logIn, logOut, getBearerToken };
}
