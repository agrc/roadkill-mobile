import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('react-native/src/private/animated/NativeAnimatedHelper.js');
jest.mock('expo-constants', () => {
  return {
    expoConfig: {
      extra: {
        API: '',
      },
    },
  };
});
jest.mock('expo-localization', () => {
  return {
    getLocales: () => [{ languageCode: 'en' }],
  };
});
