import { useNetInfo } from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import propTypes from 'prop-types';
import React from 'react';
import { Alert, Platform } from 'react-native';
import * as Sentry from 'sentry-expo';

// make sure that tiles cache directory is created
export const tileCacheDirectory = FileSystem.cacheDirectory + 'tiles';
const offlineDataStorageDirectory = FileSystem.documentDirectory + 'offlineData';
const offlineMessage = 'No connection to the internet was detected.';
const errorMessage = 'An error occurred while trying to upload your report:';
const commonMessage = 'You report has been saved to the your device for later submission.';
const dataFileName = 'data.json';

function ensureDirectory(path) {
  FileSystem.getInfoAsync(path, { size: true }).then((info) => {
    if (!info.exists) {
      FileSystem.makeDirectoryAsync(path);
    }
  });
}

ensureDirectory(tileCacheDirectory);
ensureDirectory(offlineDataStorageDirectory);

const OfflineCacheContext = React.createContext();

export async function getOfflineSubmission(id, pickupIndex) {
  try {
    const json = await FileSystem.readAsStringAsync(`${offlineDataStorageDirectory}/${id}/${dataFileName}`);

    if (pickupIndex) {
      return JSON.parse(json).pickups[pickupIndex];
    }

    return JSON.parse(json);
  } catch (error) {
    console.log(
      `Error attempting to read offline submission with id: ${id} (pickupIndex: ${pickupIndex}): \n\n ${error}`
    );
    Sentry.Native.captureException(error);

    return null;
  }
}

export function OfflineCacheContextProvider({ children }) {
  const { isConnected } = useNetInfo();
  const [cachedSubmissionIds, setCachedSubmissionIds] = React.useState([]);

  React.useEffect(() => {
    const giddyUp = async () => {
      const folderNames = await FileSystem.readDirectoryAsync(offlineDataStorageDirectory);

      // filter out any weird stuff like .DS_Store
      setCachedSubmissionIds(folderNames.filter((folderName) => folderName.match(/^\d+$/)));
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

  const movePhoto = async function (photo, directory) {
    // copy photo to documentDirectory so that it doesn't get auto-deleted by the OS
    // ImagePicker puts it in the cacheDirectory
    if (photo) {
      const { uri } = photo;
      const fileName = uri.split('/').pop();
      const newUri = `${directory}/${fileName}`;
      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });
      photo.uri = newUri;
    }

    return photo;
  };

  const showAlert = async function (error) {
    await new Promise((resolve) => {
      Alert.alert(
        'Offline Report',
        (error ? `${errorMessage} \n\n ${error.message}` : offlineMessage) + '\n\n' + commonMessage,
        [{ text: 'OK', onPress: resolve }]
      );
    });
  };

  const cacheReport = async function (submitValues, error) {
    const id = new Date().getTime();
    const reportDirectory = `${offlineDataStorageDirectory}/${id}`;
    await FileSystem.makeDirectoryAsync(reportDirectory);

    submitValues.offlineStorageId = id;

    submitValues.photo = await movePhoto(submitValues.photo, reportDirectory);

    await FileSystem.writeAsStringAsync(`${reportDirectory}/${dataFileName}`, JSON.stringify(submitValues));

    setCachedSubmissionIds((existing) => [...existing, id]);

    await showAlert(error);
  };

  const cacheRoute = async function (submitValues, pickups, error) {
    const id = new Date().getTime();
    const routeDirectory = `${offlineDataStorageDirectory}/${id}`;
    await FileSystem.makeDirectoryAsync(routeDirectory);

    submitValues.offlineStorageId = id;

    for (let i = 0; i < pickups.length; i++) {
      pickups[i].photo = await movePhoto(pickups[i].photo, routeDirectory);
    }

    await FileSystem.writeAsStringAsync(
      `${routeDirectory}/${dataFileName}`,
      JSON.stringify({ ...submitValues, pickups })
    );

    setCachedSubmissionIds((existing) => [...existing, id]);

    await showAlert(error);
  };

  return (
    <OfflineCacheContext.Provider value={{ isConnected, cacheReport, cacheRoute, cachedSubmissionIds }}>
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
