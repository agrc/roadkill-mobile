import * as Facebook from 'expo-facebook';
import ky from 'ky';
import React from 'react';
import config from '../../config';
import { useAsyncError } from '../../utilities';

export const isAuthenticationExpired = (auth) => {
  return new Date(auth.expirationDate) < Date.now();
};

export default function useFacebookProvider() {
  const authentication = React.useRef(null);
  React.useEffect(() => {
    Facebook.initializeAsync({
      appId: process.env.FACEBOOK_OAUTH_CLIENT_ID,
    });
  }, []);

  const throwAsyncError = useAsyncError();
  const getAuthentication = async () => {
    try {
      const { type, token, expirationDate } = await Facebook.logInWithReadPermissionsAsync();

      if (type === 'success') {
        authentication.current = {
          token,
          expirationDate,
        };

        return authentication.current;
      } else if (['cancel', 'dismiss'].indexOf(type) > -1) {
        return null;
      } else {
        throwAsyncError(new Error(`type: ${type};`));
      }
    } catch (error) {
      throwAsyncError(error);
    }
  };

  const logIn = async () => {
    const auth = await getAuthentication();

    if (!auth?.token) {
      return null;
    }

    let user;
    try {
      user = await ky('https://graph.facebook.com/me', {
        searchParams: {
          access_token: auth.token,
          fields: 'id,first_name,last_name,name,email',
        },
      }).json();
    } catch (error) {
      throwAsyncError(error);
    }

    return {
      name: user.name,
      sub: user.id,
      email: user.email,
      given_name: user.first_name,
      family_name: user.last_name,
    };
  };

  const logOut = async () => {
    authentication.current = null;

    try {
      await Facebook.logOutAsync();
    } catch (error) {
      throwAsyncError(error);
    }
  };

  const getBearerToken = async () => {
    const prefix = `${config.PROVIDER_NAMES.facebook}: Bearer `;

    if (authentication.current && !isAuthenticationExpired(authentication.current)) {
      return prefix + authentication.current.token;
    }

    const auth = await getAuthentication();

    if (auth.token) {
      return prefix + auth.token;
    } else {
      throwAsyncError(new Error('No access token'));
    }
  };

  return { logIn, logOut, getBearerToken };
}
