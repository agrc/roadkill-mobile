import { useNetInfo } from '@react-native-community/netinfo';
import {
  cacheDirectory,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  moveAsync,
  readAsStringAsync,
  readDirectoryAsync,
  writeAsStringAsync,
} from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import lodash from 'lodash';
import prettyBytes from 'pretty-bytes';
import propTypes from 'prop-types';
import React from 'react';
import { Alert, Platform } from 'react-native';
import { useMutation, useQueryClient } from 'react-query';
import * as Sentry from 'sentry-expo';
import { useAPI } from './api';
import config from './config';
import { isPickupReport } from './utilities';

// tiles are put into the cache directory to allow the OS to clean them up if the device gets low on space
export const tileCacheDirectory = cacheDirectory + 'tiles';
const offlineDataStorageDirectory = documentDirectory + 'offlineData';
const offlineMessage = 'No connection to the internet was detected.';
const errorMessage = 'An error occurred while trying to upload your report:';
const commonMessage = 'You report has been saved to the your device for later submission.';
const dataFileName = 'data.json';

function ensureDirectory(path) {
  return getInfoAsync(path, { size: true }).then((info) => {
    if (!info.exists) {
      makeDirectoryAsync(path);
    }
  });
}

ensureDirectory(tileCacheDirectory);
ensureDirectory(offlineDataStorageDirectory);

export async function getBaseMapCacheSize() {
  const { size } = await getInfoAsync(tileCacheDirectory);

  return prettyBytes(size);
}
export async function clearBaseMapCache() {
  await deleteAsync(tileCacheDirectory);
  await ensureDirectory(tileCacheDirectory);
}

const OfflineCacheContext = React.createContext();

export async function getOfflineSubmission(id, pickupIndex) {
  try {
    const json = await readAsStringAsync(`${offlineDataStorageDirectory}/${id}/${dataFileName}`);

    if (pickupIndex) {
      return JSON.parse(json).pickups[pickupIndex];
    }

    return JSON.parse(json);
  } catch (error) {
    console.error(
      `Error attempting to read offline submission with id: ${id} (pickupIndex: ${pickupIndex}): \n\n ${error}`
    );
    Sentry.Native.captureException(error);

    return null;
  }
}

async function deleteOfflineSubmission(id) {
  try {
    await deleteAsync(`${offlineDataStorageDirectory}/${id}`);
  } catch (error) {
    console.error(`Error attempting to delete offline submission with id: ${id}: \n\n ${error}`);
    Sentry.Native.captureException(error);
  }
}

export function OfflineCacheContextProvider({ children }) {
  const { isInternetReachable } = useNetInfo();
  const [cachedSubmissionIds, setCachedSubmissionIds] = React.useState([]);
  const { postReport, postRoute } = useAPI();

  React.useEffect(() => {
    const giddyUp = async () => {
      const folderNames = await readDirectoryAsync(offlineDataStorageDirectory);

      // filter out any weird stuff like .DS_Store
      setCachedSubmissionIds(folderNames.filter((folderName) => folderName.match(/^\d+$/)));
    };

    giddyUp();
  }, []);

  const submit = async function () {
    console.log('submitting offline submissions...');
    const failedSubmissionIds = [];
    let lastError;
    for (let i = 0; i < cachedSubmissionIds.length; i++) {
      try {
        console.log(`submitting: ${cachedSubmissionIds[i]}`);
        const submission = await getOfflineSubmission(cachedSubmissionIds[i]);
        delete submission.offlineStorageId;
        if (submission.animal_location) {
          // report
          if (isPickupReport(submission)) {
            await postReport(submission, config.REPORT_TYPES.pickup);
          } else {
            await postReport(submission, config.REPORT_TYPES.report);
          }
        } else {
          // route
          const routeResponse = await postRoute(lodash.omit(submission, ['pickups']));

          for (let j = 0; j < submission.pickups.length; j++) {
            const pickup = submission.pickups[j];
            delete pickup.offlineStorageId;
            pickup.route_id = routeResponse.route_id;

            await postReport(pickup, config.REPORT_TYPES.pickup);
          }
        }

        await deleteOfflineSubmission(cachedSubmissionIds[i]);
      } catch (error) {
        failedSubmissionIds.push(cachedSubmissionIds[i]);
        Sentry.Native.captureException(error);
        console.error(error);
        lastError = error.message;
      }
    }

    setCachedSubmissionIds(failedSubmissionIds);

    return lastError;
  };

  const queryClient = useQueryClient();
  const mutation = useMutation(submit, {
    onSuccess: () => {
      queryClient.invalidateQueries(config.QUERY_KEYS.submissions);
      queryClient.invalidateQueries(config.QUERY_KEYS.profile);
    },
  });

  React.useEffect(() => {
    if (isInternetReachable && cachedSubmissionIds.length > 0 && !mutation.isLoading) {
      mutation.mutate();
    }
  }, [isInternetReachable]);

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
      await moveAsync({
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
    await makeDirectoryAsync(reportDirectory);

    submitValues.offlineStorageId = id;

    submitValues.photo = await movePhoto(submitValues.photo, reportDirectory);

    await writeAsStringAsync(`${reportDirectory}/${dataFileName}`, JSON.stringify(submitValues));

    setCachedSubmissionIds((existing) => [...existing, id]);

    await showAlert(error);
  };

  const cacheRoute = async function (submitValues, pickups, error) {
    const id = new Date().getTime();
    const routeDirectory = `${offlineDataStorageDirectory}/${id}`;
    await makeDirectoryAsync(routeDirectory);

    submitValues.offlineStorageId = id;

    for (let i = 0; i < pickups.length; i++) {
      pickups[i].photo = await movePhoto(pickups[i].photo, routeDirectory);
    }

    await writeAsStringAsync(`${routeDirectory}/${dataFileName}`, JSON.stringify({ ...submitValues, pickups }));

    setCachedSubmissionIds((existing) => [...existing, id]);

    await showAlert(error);
  };

  return (
    <OfflineCacheContext.Provider
      value={{
        isConnected: isInternetReachable,
        cacheReport,
        cacheRoute,
        cachedSubmissionIds,
        submitOfflineSubmissions: mutation.mutate.bind(mutation),
        isSubmitting: mutation.isLoading,
      }}
    >
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
