import * as SecureStorage from 'expo-secure-store';
import React from 'react';

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
