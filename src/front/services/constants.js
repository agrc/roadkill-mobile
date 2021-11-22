import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from 'sentry-expo';
import bundledConstants from './constants.json';

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
      return bundledConstants;
    }
  } catch (error) {
    Sentry.Native.captureException(error);

    console.error(`error getting constants: ${error?.message}`);
  }
}
