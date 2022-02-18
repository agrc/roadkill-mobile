import * as Location from 'expo-location';
import ky from 'ky';
import React from 'react';
import config from './config';

export const ACCURACY = Location.Accuracy;
export const getLocation = async (accuracy = Location.Accuracy.Balanced) => {
  let location;
  // work around for: https://github.com/expo/expo/issues/14248
  try {
    location = await Location.getCurrentPositionAsync({
      accuracy,
    });
  } catch (error) {
    console.log(`getCurrentPositionAsync: ${error}`);

    location = await Location.getLastKnownPositionAsync({
      accuracy,
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

  const zoomTo = (location, zoom) => {
    const camera = {
      center: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
    };

    if (zoom) {
      camera.zoom = zoom;
    }

    if (mapViewRef.current) {
      mapViewRef.current.animateCamera(camera);
    }
  };

  const getCallback = (zoom) => {
    return (location) => {
      lastUserLocation.current = location;

      zoomTo(location, zoom);
    };
  };

  const followUser = async (zoom) => {
    if (lastUserLocation.current) {
      zoomTo(lastUserLocation.current, zoom);
    }

    if (subscription) return;

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Highest,
        distanceInterval: 1, // in meters
      },
      getCallback(zoom)
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
  let currentLocation = await Location.getLastKnownPositionAsync();

  if (!currentLocation) {
    currentLocation = await getLocation();
  }

  let prompt = 'If you encounter a live animal please contact your local law enforcement.';
  try {
    const response = await ky(`${config.URLS.PSAP_FEATURE_SERVICE}/query`, {
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
    }).json();

    if (response.features?.length) {
      const attributes = response.features[0].attributes;

      prompt = `If you encounter a live animal that needs assistance, please call ${attributes.DsplayName} at ${attributes.PHONE_NUMBER}.`;
    }
  } catch (error) {
    console.error(error);
  }

  return prompt;
}
