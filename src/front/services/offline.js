import { useNetInfo } from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import propTypes from 'prop-types';
import React from 'react';
import { Alert, Platform } from 'react-native';

// make sure that tiles cache directory is created
export const tileCacheDirectory = FileSystem.cacheDirectory + 'tiles';
const offlineDataStorageDirectory = FileSystem.documentDirectory + 'offlineData';
const offlineMessage = 'No connection to the internet was detected.';
const errorMessage = 'An error occurred while trying to upload your report:';
const commonMessage = 'You report has been saved to the your device for later submission.';
const dataFileName = 'data.json';

function ensureDirectory(path) {
  FileSystem.getInfoAsync(path, { size: true }).then((info) => {
    console.log(`${path} info`, info);
    if (!info.exists) {
      console.log(`creating ${path}`);
      FileSystem.makeDirectoryAsync(path);
    }
  });
}

ensureDirectory(tileCacheDirectory);
ensureDirectory(offlineDataStorageDirectory);

const OfflineCacheContext = React.createContext();

export async function getOfflineSubmission(id) {
  const json = await FileSystem.readAsStringAsync(`${offlineDataStorageDirectory}/${id}/${dataFileName}`);

  return JSON.parse(json);
}

export function OfflineCacheContextProvider({ children }) {
  const { isConnected } = useNetInfo();
  const [cachedSubmissionIds, setCachedSubmissionIds] = React.useState([]);

  const hasUnsubmittedData = cachedSubmissionIds && cachedSubmissionIds.length > 0;

  React.useEffect(() => {
    const giddyUp = async () => {
      const folderNames = await FileSystem.readDirectoryAsync(offlineDataStorageDirectory);

      setCachedSubmissionIds(folderNames);
    };

    giddyUp();
  }, []);

  React.useEffect(() => {
    const updateBadgeCount = async () => {
      let badgeNumber = 0;
      if (cachedSubmissionIds && cachedSubmissionIds.length > 0) {
        badgeNumber = cachedSubmissionIds.length;
      }

      let allowed = true;
      if (Platform.OS === 'ios') {
        let status = await Notifications.getPermissionsAsync();
        if (status.ios.status === Notifications.IosAuthorizationStatus.NOT_DETERMINED) {
          status = await Notifications.requestPermissionsAsync({ ios: { allowBadge: true } });
        }
        allowed = status.ios.status !== Notifications.IosAuthorizationStatus.DENIED;
      }

      if (allowed) {
        await Notifications.setBadgeCountAsync(badgeNumber);
      }
    };

    updateBadgeCount();
  }, [cachedSubmissionIds]);

  const cacheReport = async function (submitValues, error) {
    const id = new Date().getTime();
    const reportDirectory = `${offlineDataStorageDirectory}/${id}`;
    await FileSystem.makeDirectoryAsync(reportDirectory);

    submitValues.offlineStorageId = id;

    // copy photo to documentDirectory so that it doesn't get auto-deleted by the OS
    // ImagePicker puts it in the cacheDirectory
    if (submitValues.photo) {
      const { uri } = submitValues.photo;
      const fileName = uri.split('/').pop();
      const newUri = `${reportDirectory}/${fileName}`;
      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });
      submitValues.photo.uri = newUri;
    }

    await FileSystem.writeAsStringAsync(`${reportDirectory}/${dataFileName}`, JSON.stringify(submitValues));

    setCachedSubmissionIds((existing) => [...existing, id]);

    await new Promise((resolve) => {
      Alert.alert(
        'Offline Report',
        (error ? `${errorMessage} \n\n ${error.message}` : offlineMessage) + '\n\n' + commonMessage,
        [{ text: 'OK', onPress: resolve }]
      );
    });
  };

  return (
    <OfflineCacheContext.Provider value={{ isConnected, cacheReport, hasUnsubmittedData, cachedSubmissionIds }}>
      {children}
    </OfflineCacheContext.Provider>
  );
}
OfflineCacheContextProvider.propTypes = {
  children: propTypes.object,
};

export function useOfflineCache() {
  const context = React.useContext(OfflineCacheContext);
  if (!context) {
    throw new Error('useOfflineCache must be used within a OfflineCacheProvider');
  }
  return context;
}
