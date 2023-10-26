import * as Location from 'expo-location';
import React from 'react';
import { Platform } from 'react-native';
import config from './config';
import myFetch from './fetch';

export const ACCURACY = Location.Accuracy;
export const getLocation = async (accuracy = Location.Accuracy.Balanced) => {
  let location;
  // work around for: https://github.com/expo/expo/issues/14248
  try {
    if (accuracy <= Location.Accuracy.Balanced) {
      console.log('getting last known location');
      location = await Location.getLastKnownPositionAsync({
        maxAge: 1000 * 60 * 5, // 5 minutes
      });

      if (location) {
        return location;
      }
    }

    console.log('getting current position', accuracy);
    location = await Location.getCurrentPositionAsync({
      accuracy,
    });
  } catch (error) {
    console.log(`getCurrentPositionAsync: ${error}`);

    location = await Location.getLastKnownPositionAsync({
      requiredAccuracy: accuracy,
    });
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
  }, []);

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

export async function getAssistancePrompt() {
  const existingPermissions = await Location.getForegroundPermissionsAsync();

  let prompt =
    'If you encounter a live animal please contact your local law enforcement.';
  if (!existingPermissions.granted) {
    return prompt;
  }

  let currentLocation = await Location.getLastKnownPositionAsync();

  if (!currentLocation) {
    currentLocation = await getLocation();
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

      prompt = `If you encounter a live animal that needs assistance, please call ${attributes.DsplayName} at ${attributes.PHONE_NUMBER}.`;
    }
  } catch (error) {
    console.error(error);
  }

  return prompt;
}
