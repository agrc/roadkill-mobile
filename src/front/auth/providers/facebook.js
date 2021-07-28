import * as Facebook from 'expo-facebook';
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
      } else if (type === 'cancel') {
        return null;
      } else {
        new Error('Facebook Login Error');
      }
    } catch (error) {
      throwAsyncError(error);
    }
  };

  const logIn = async () => {
    const { token } = await getAuthentication();

    if (!token) {
      return null;
    }

    const response = await fetch(
      `https://graph.facebook.com/me?access_token=${token}&fields=id,first_name,last_name,name,email`
    );
    const user = await response.json();

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

    const { token } = await getAuthentication();

    if (token) {
      return prefix + token;
    } else {
      throwAsyncError(new Error('No access token'));
    }
  };

  return { logIn, logOut, getBearerToken };
}
