import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

// got this idea from: https://forums.expo.dev/t/how-to-setstate-from-within-taskmanager/26630/5?u=agrc
function BackgroundLocationService() {
  let subscriber;

  return {
    subscribe: (callback) => (subscriber = callback),
    unsubscribe: () => {
      subscriber = null;
    },
    notify: (location) => subscriber && subscriber(location),
    taskName: 'wvcr-vehicle-tracking-background-task',
  };
}

export default new BackgroundLocationService();

export async function verifyPermissions() {
  console.log('verifyPermissions');
  const result = await Location.requestBackgroundPermissionsAsync();

  if (!result.granted) {
    Alert.alert('Error', 'Background location permissions are required to record vehicle routes.', [
      { text: 'OK', onPress: () => Linking.openSettings() },
    ]);

    return false;
  }

  const enabled = await Location.hasServicesEnabledAsync();

  if (!enabled) {
    Alert.alert('Error', 'Location services are required to record vehicle routes.', [
      { text: 'OK', onPress: () => Linking.openSettings() },
    ]);

    return false;
  }

  return true;
}
