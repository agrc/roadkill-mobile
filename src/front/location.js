import * as Location from 'expo-location';
import React from 'react';

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

export function locationToRegion(location) {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: 0.1,
    longitudeDelta: 0.05,
  };
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
