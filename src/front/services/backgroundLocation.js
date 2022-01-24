import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';

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

  const existingPermissions = await Location.getBackgroundPermissionsAsync();
  console.log('existingPermissions', existingPermissions);

  if (!existingPermissions.granted) {
    if (Platform.OS === 'android') {
      Alert.alert(
        'Please grant permissions',
        'Background location permissions are required to record vehicle routes.',
        [{ text: 'OK' }]
      );
    }

    const result = await Location.requestBackgroundPermissionsAsync();
    console.log('result', result);

    if (!result.granted) {
      return false;
    }
  }

  const enabled = await Location.hasServicesEnabledAsync();
  console.log('enabled', enabled);

  if (!enabled) {
    Alert.alert('Error', 'Location services are required to record vehicle routes.', [
      { text: 'OK', onPress: () => Linking.openSettings() },
    ]);

    return false;
  }

  return true;
}
