import * as Location from 'expo-location';
import pTimeout from 'p-timeout';
import React from 'react';
import { Platform } from 'react-native';
import config from './config';
import myFetch from './fetch';
import t from './localization';

export const ACCURACY = Location.Accuracy;
export const getLocation = async (accuracy = Location.Accuracy.Low) => {
  let location;
  try {
    if (accuracy <= Location.Accuracy.Low) {
      console.log('getting last known location');
      location = await Location.getLastKnownPositionAsync({
        maxAge: 1000 * 60 * 2, // minutes
      });

      if (location) {
        return location;
      }
    }

    console.log('getting current position', accuracy);
    location = await pTimeout(
      Location.getCurrentPositionAsync({
        accuracy,
        timeout: 8000,
      }),
      { milliseconds: 15000 },
    );
  } catch (error) {
    console.warn(
      `getCurrentPositionAsync: ${error}, falling back to last known position`,
    );

    location = await Location.getLastKnownPositionAsync({
      requiredAccuracy: accuracy,
    });

    if (!location && accuracy <= Location.Accuracy.Low) {
      console.warn(
        'getLastKnownPositionAsync failed, falling back to point in capital building',
      );

      return {
        coords: {
          // capital building
          latitude: 40.777,
          longitude: -111.888,
        },
      };
    }
  }

  return location;
};

const REGION_BUFFER = {
  latitudeDelta: 0.1,
  longitudeDelta: 0.05,
};

export function locationToRegion(location) {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    ...REGION_BUFFER,
  };
}

export function coordsToLocation(coords) {
  if (!coords) {
    return null;
  }

  const [x, y] = coords.split(' ');

  return { longitude: parseFloat(x), latitude: parseFloat(y) };
}

export function useFollowUser(mapViewRef) {
  const [subscription, setSubscription] = React.useState(false);
  const lastUserLocation = React.useRef(null);

  React.useEffect(() => {
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [subscription]);

  const zoomTo = (location, zoomIn) => {
    const camera = {
      center: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
    };

    if (zoomIn) {
      if (Platform.OS === 'android') {
        camera.zoom = config.MAX_ZOOM_LEVEL;
      } else {
        camera.altitude = config.MIN_ALTITUDE;
      }
    }

    if (mapViewRef.current) {
      mapViewRef.current.animateCamera(camera);
    }
  };

  const getCallback = (zoomIn) => {
    return (location) => {
      lastUserLocation.current = location;

      zoomTo(location, zoomIn);
    };
  };

  const followUser = async (zoomIn) => {
    if (lastUserLocation.current) {
      zoomTo(lastUserLocation.current, zoomIn);
    }

    if (subscription) return;

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Highest,
        distanceInterval: 1, // in meters
      },
      getCallback(zoomIn),
    );

    setSubscription(sub);
  };

  const stopFollowUser = () => {
    if (!subscription) return;

    subscription.remove();
    setSubscription(null);
  };

  return { followUser, stopFollowUser, isFollowing: !!subscription };
}

const cache = {};

export async function getAssistancePrompt() {
  const existingPermissions = await Location.getForegroundPermissionsAsync();

  let prompt = t('services.location.liveAnimalLocalLaw');
  if (!existingPermissions.granted) {
    return prompt;
  }

  let currentLocation = await Location.getLastKnownPositionAsync({
    maxAge: 1000 * 60 * 10, // minutes
  });

  if (!currentLocation) {
    currentLocation = await getLocation();
  }

  const cacheKey = `${currentLocation.coords.latitude.toFixed(
    2,
  )},${currentLocation.coords.longitude.toFixed(2)}`;

  if (cache[cacheKey]) {
    return cache[cacheKey];
  }

  try {
    const response = await myFetch(
      `${config.URLS.PSAP_FEATURE_SERVICE}/query`,
      {
        searchParams: {
          f: 'json',
          outFields: 'DsplayName,PHONE_NUMBER',
          geometryType: 'esriGeometryPoint',
          geometry: JSON.stringify({
            x: currentLocation.coords.longitude,
            y: currentLocation.coords.latitude,
            spatialReference: {
              wkid: 4326,
            },
          }),
          returnGeometry: false,
        },
      },
      true,
    );

    if (response.features?.length) {
      const attributes = response.features[0].attributes;

      prompt = t('services.location.liveAnimal', {
        name: attributes.DsplayName,
        phone: attributes.PHONE_NUMBER,
      });

      cache[cacheKey] = prompt;
    }
  } catch (error) {
    console.error(error);
  }

  return prompt;
}
