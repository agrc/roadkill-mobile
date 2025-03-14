import { format } from 'date-fns';
import { applicationName } from 'expo-application';
import * as Linking from 'expo-linking';
import * as MailComposer from 'expo-mail-composer';
import * as SecureStorage from 'expo-secure-store';
import React from 'react';
import { Alert } from 'react-native';
import config from './config';
import t from './localization';

export function useMounted() {
  const isMounted = React.useRef(true);
  React.useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  return isMounted.current;
}

export function useSecureState(key, defaultValue) {
  // state will be undefined until is has been initialized,
  // then it will be the value or null
  const [state, setInternalState] = React.useState();

  React.useEffect(() => {
    const init = async () => {
      let value = null;
      try {
        value = await SecureStorage.getItemAsync(key);
      } catch (error) {
        console.error('error secure state get', key, error);
      }

      if (!value && defaultValue !== undefined) {
        value = defaultValue;
      }

      try {
        setInternalState(JSON.parse(value));
      } catch (e) {
        setInternalState(value);
      }
    };

    init();
  }, [defaultValue, key]);

  const setState = (value) => {
    // value could be string or object
    setInternalState(value);
    SecureStorage.setItemAsync(
      key,
      typeof value === 'object' ? JSON.stringify(value) : value,
    );
  };

  return [state, setState];
}

const secureStoreOptions = {
  keychainAccessible: SecureStorage.ALWAYS,
};

export function useSecureRef(key) {
  const ref = React.useRef();

  React.useEffect(() => {
    const init = async () => {
      const value = await SecureStorage.getItemAsync(key, secureStoreOptions);

      try {
        ref.current = JSON.parse(value);
      } catch (e) {
        ref.current = value;
      }
    };

    init();
  }, [key]);

  const setRef = (value) => {
    // value could be string or object
    ref.current = value;
    SecureStorage.setItemAsync(
      key,
      typeof value === 'object' ? JSON.stringify(value) : value,
      secureStoreOptions,
    );
  };

  return [ref, setRef];
}

// https://github.com/facebook/react/issues/14981#issuecomment-468460187
export function useAsyncError() {
  // eslint-disable-next-line no-unused-vars
  const [_, setError] = React.useState(null);
  const mounted = React.useRef(false);

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const throwAsyncError = React.useCallback(
    (error) => {
      if (mounted.current) {
        setError(() => {
          throw error;
        });
      }
    },
    [setError],
  );

  return throwAsyncError;
}

export function isTokenExpired(token) {
  if (typeof token === 'string') {
    throw new Error('token must be an object, did you forget to decode it?');
  }

  if (!token?.exp) {
    return true;
  }

  const expireTime = token.exp * 1000;

  return expireTime < Date.now();
}

export async function sendEmailToSupport() {
  const subject = `${applicationName} Reporter - Support`;

  if (await MailComposer.isAvailableAsync()) {
    return await MailComposer.composeAsync({
      subject,
      recipients: [config.SUPPORT_EMAIL],
    });
  }

  try {
    Linking.openURL(`mailto:${config.SUPPORT_EMAIL}`);
  } catch (error) {
    // user may not have email app installed
    Alert.alert(
      t('services.utilities.support'),
      t('services.utilities.pleaseSendEmail', { email: config.SUPPORT_EMAIL }),
    );
  }
}

export async function wrapAsyncWithDelay(action, preAction, postAction, delay) {
  const timeoutHandler = setTimeout(() => {
    preAction();
  }, delay);
  const applyPostAction = () => {
    clearTimeout(timeoutHandler);
    postAction();
  };

  let result;
  try {
    result = await action();
  } catch (error) {
    applyPostAction();

    return error;
  } finally {
    applyPostAction();
  }

  return result;
}

export function pointCoordinatesToString(coordinates) {
  if (!coordinates) {
    return null;
  }

  return `${coordinates.longitude} ${coordinates.latitude}`;
}

export function lineCoordinatesToString(coordinates) {
  return coordinates.reduce((previous, coord) => {
    if (!previous) {
      return pointCoordinatesToString(coord);
    }

    return `${previous}, ${pointCoordinatesToString(coord)}`;
  }, null);
}

export function pointStringToCoordinates(string) {
  const [longitude, latitude] = string.split(' ');

  return { longitude: parseFloat(longitude), latitude: parseFloat(latitude) };
}

const lineStringRegex = /\((.*)\)/;
export function lineStringToCoordinates(string) {
  const match = lineStringRegex.exec(string);

  return match[1].split(',').map((coord) => pointStringToCoordinates(coord));
}

export function offlineLineStringToCoordinates(lineString) {
  return lineString
    .split(',')
    .map((coord) => pointStringToCoordinates(coord.trim()));
}

function extentToRegion(minx, maxx, miny, maxy) {
  return {
    latitude: (miny + maxy) / parseFloat(2),
    longitude: (minx + maxx) / parseFloat(2),
    latitudeDelta: maxy - miny,
    longitudeDelta: maxx - minx,
  };
}

const extentStringRegex = /\(\((.*)\)\)/;
export function extentStringToRegion(string) {
  const match = extentStringRegex.exec(string);

  const coords = match[1]
    .split(',')
    .map((coord) => pointStringToCoordinates(coord));

  const minx = coords[0].longitude;
  const maxx = coords[2].longitude;
  const miny = coords[0].latitude;
  const maxy = coords[2].latitude;

  return extentToRegion(minx, maxx, miny, maxy);
}

export function coordinatesToRegion(coordinates) {
  let minx, maxx, miny, maxy;

  coordinates.forEach((coord) => {
    if (!minx || coord.longitude < minx) {
      minx = coord.longitude;
    }
    if (!maxx || coord.longitude > maxx) {
      maxx = coord.longitude;
    }
    if (!miny || coord.latitude < miny) {
      miny = coord.latitude;
    }
    if (!maxy || coord.latitude > maxy) {
      maxy = coord.latitude;
    }
  });

  return extentToRegion(minx, maxx, miny, maxy);
}

export function dateToString(date, showTime = true) {
  if (showTime) {
    return date ? format(new Date(date), "MMM d, yyyy 'at' h:mm:ss aa") : null;
  }

  return date ? format(new Date(date), 'MMM d, yyyy') : null;
}

export const booleanToYesNo = (bool) => (bool ? 'yes' : 'no');

export const isPickupReport = (report) => {
  return !!report.pickup_date;
};

export function getSubmitValues(values) {
  const output = {};

  for (let key in values) {
    const value = values[key];

    if (value instanceof Date) {
      output[key] = value.toISOString();
    } else if (value !== null && value !== undefined) {
      output[key] = value;
    }
  }

  return output;
}

let ruler;
let rulerLatitude;
export function appendCoordinates(existing, newCoordinates, CheapRuler) {
  // if there is no existing coordinates, grab the first new coordinate
  if (existing.length === 0) {
    existing.push(newCoordinates.shift());
  }

  let last = existing[existing.length - 1];

  // only create a new ruler if the latitude has changed by more than 1 degree
  if (!ruler || Math.abs(rulerLatitude - last.latitude) > 1) {
    ruler = new CheapRuler(last.latitude, 'meters');
    rulerLatitude = last.latitude;
  }

  for (let coordinates of newCoordinates) {
    last = existing[existing.length - 1];
    const distance = ruler.distance(
      [last.longitude, last.latitude],
      [coordinates.longitude, coordinates.latitude],
    );

    if (distance >= config.MIN_TRACKING_VERTEX_DISTANCE) {
      existing.push(coordinates);
    }
  }

  return existing;
}
