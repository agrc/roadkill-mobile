import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import * as Sentry from 'sentry-expo';

const KEY = '@roadkill_constants';
export async function updateConstants(constants) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(constants));
  } catch (error) {
    Sentry.Native.captureException(error);

    console.error(`error saving constants: ${error?.message}`);
  }
}

export async function getConstants() {
  try {
    const constants = await AsyncStorage.getItem(KEY);

    if (constants) {
      return JSON.parse(constants);
    } else {
      // fallback to bundled data
      const asset = Asset.fromModule(require('./constants.json.lazy'));

      await asset.downloadAsync();

      const json = await FileSystem.readAsStringAsync(asset.localUri);

      return JSON.parse(json);
    }
  } catch (error) {
    Sentry.Native.captureException(error);

    console.error(`error getting constants: ${error?.message}`);
  }
}
