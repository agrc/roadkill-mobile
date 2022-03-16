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
    await new Promise((resolve) => {
      let buttons = [{ text: 'OK', onPress: resolve }];
      if (!existingPermissions.canAskAgain) {
        buttons.push({ text: 'Go To Settings', onPress: () => Linking.openSettings() });
      }
      Alert.alert(
        'Background Location Permissions',
        [
          'This app collects location data to enable the tracking of vehicle routes even when the app is closed or',
          'not in use. Data is only collected when a tracking session is active. Data submitted to the server is only',
          'used for billing purposes and is not shared with any third parties.',
          `Please select the **${
            Platform.OS === 'android' ? 'Allow all the time' : 'Always'
          }** option in the location settings dialog`,
        ].join(' '),
        buttons
      );
    });

    const result = await Location.requestBackgroundPermissionsAsync();

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
