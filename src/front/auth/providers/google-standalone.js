import * as GoogleSignIn from 'expo-google-sign-in';
import React from 'react';
import config from '../../config';
import { useAsyncError } from '../../utilities';

const remapUser = (user) => {
  return {
    ...user,
    email: user.email,
    sub: user.uid,
    given_name: user.firstName,
    family_name: user.lastName,
    name: `${user.firstName} ${user.lastName}`,
  };
};

// this is a work around for this issue: https://forums.expo.dev/t/app-appears-twice-on-open-with-list-after-google-auth/55659/6?u=agrc
// only used on Android in standalone app
export default function useGoogleProviderForStandalone() {
  const cachedUser = React.useRef(null);
  const throwAsyncError = useAsyncError();

  React.useEffect(() => {
    const giddyUp = async () => {
      await GoogleSignIn.initAsync();
      const user = await GoogleSignIn.signInSilentlyAsync();
      cachedUser.current = user;
    };

    giddyUp();
  }, []);

  const logIn = async () => {
    let result;
    try {
      await GoogleSignIn.askForPlayServicesAsync();
      result = await GoogleSignIn.signInAsync();
    } catch (error) {
      throwAsyncError(error);
    }

    if (result?.type === 'success') {
      cachedUser.current = result.user;

      return remapUser(result.user);
    }

    return null;
  };

  const logOut = async () => {
    cachedUser.current = null;
    await GoogleSignIn.signOutAsync();
  };

  const getBearerToken = async () => {
    return `${config.PROVIDER_NAMES.google}:Bearer ${cachedUser.current.auth.accessToken}`;
  };

  return { logIn, logOut, getBearerToken };
}
