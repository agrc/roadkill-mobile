import * as SecureStorage from 'expo-secure-store';
import React from 'react';
import config from './config';

export function useMounted() {
  const isMounted = React.useRef(true);
  React.useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  return isMounted;
}

export function useSecureState(key) {
  // state will be undefined until is has been initialized,
  // then it will be the value or null
  const [state, setInternalState] = React.useState();

  React.useEffect(() => {
    const init = async () => {
      const value = await SecureStorage.getItemAsync(key);

      try {
        setInternalState(JSON.parse(value));
      } catch (e) {
        setInternalState(value);
      }
    };

    init();
  }, []);

  const setState = (value) => {
    // value could be string or object
    setInternalState(value);
    SecureStorage.setItemAsync(key, typeof value === 'object' ? JSON.stringify(value) : value);
  };

  return [state, setState];
}

// https://github.com/facebook/react/issues/14981#issuecomment-468460187
export function useAsyncError() {
  const [_, setError] = React.useState(null);
  const throwAsyncError = React.useCallback(
    (error) => {
      setError(() => {
        throw error;
      });
    },
    [setError]
  );

  return throwAsyncError;
}

export function isTokenExpired(token) {
  if (typeof token === 'string') {
    throw new Error('token must be an object, did you forget to decode it?');
  }

  const expireTime = token.exp * 1000;

  return expireTime < new Date().getTime();
}

export async function clearStorage() {
  await SecureStorage.deleteItemAsync(config.USER_STORE_KEY);
  await SecureStorage.deleteItemAsync(config.USER_TYPE_KEY);
}
