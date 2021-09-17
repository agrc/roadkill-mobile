import * as Location from 'expo-location';

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

export async function followUser(mapView, zoom) {
  const onLocationUpdate = (location) => {
    const camera = {
      center: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
    };

    if (zoom) {
      camera.zoom = zoom;
    }

    mapView.animateCamera(camera);
  };

  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Highest,
      distanceInterval: 1, // in meters
    },
    onLocationUpdate
  );

  return subscription;
}
