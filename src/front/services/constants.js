import AsyncStorage from '@react-native-async-storage/async-storage';
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
