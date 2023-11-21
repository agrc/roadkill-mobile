import { applicationId } from 'expo-application';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';
import t from './localization';

// got this idea from: https://forums.expo.dev/t/how-to-setstate-from-within-taskmanager/26630/5?u=agrc
function BackgroundLocationService() {
  let subscriber;

  return {
    subscribe: (callback) => (subscriber = callback),
    unsubscribe: () => {
      subscriber = null;
    },
    notify: (location) => subscriber && subscriber(location),
    taskName: `${applicationId}-vehicle-tracking-background-task`,
  };
}

export default new BackgroundLocationService();

export async function verifyPermissions() {
  console.log('verifyPermissions');

  const existingPermissions = await Location.getBackgroundPermissionsAsync();
  console.log('existingPermissions', existingPermissions);

  if (!existingPermissions.granted) {
    await new Promise((resolve) => {
      let buttons = [{ text: t('ok'), onPress: resolve }];
      if (!existingPermissions.canAskAgain) {
        buttons.push({
          text: t('services.backgroundLocation.goToSettings'),
          onPress: () => Linking.openSettings(),
        });
      }
      Alert.alert(
        t('services.backgroundLocation.goToSettings'),
        t('services.backgroundLocation.backgroundLocationRequired', {
          option:
            Platform.OS === 'android'
              ? t('services.backgroundLocation.allowAll')
              : t('services.backgroundLocation.always'),
        }),
        buttons,
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
    Alert.alert(t('error'), t('services.backgroundLocation.required'), [
      { text: t('ok'), onPress: () => Linking.openSettings() },
    ]);

    return false;
  }

  return true;
}
