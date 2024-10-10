import { useNetInfo } from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import propTypes from 'prop-types';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import useAuth from '../auth/context';
import { useAPI } from './api';
import config from './config';
import t from './localization';
import { isPickupReport } from './utilities';

// tiles are put into the cache directory to allow the OS to clean them up if the device gets low on space
export const tileCacheDirectory = cacheDirectory + 'tiles';
const offlineDataStorageDirectory = documentDirectory + 'offlineData';
const offlineMessage = 'No connection to the internet was detected.';
const errorMessage = 'An error occurred while trying to upload your report:';
const commonMessage =
  'You report has been saved to the your device for later submission.';
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

const OfflineCacheContext = createContext();

export async function getOfflineSubmission(id, pickupIndex) {
  const filePath = `${offlineDataStorageDirectory}/${id}/${dataFileName}`;
  try {
    // if data.json doesn't exist, remove the folder
    const fileInfo = await getInfoAsync(filePath);
    if (!fileInfo.exists) {
      try {
        await deleteAsync(`${offlineDataStorageDirectory}/${id}`);
      } catch (error) {
        // this should never happen but if it does, we don't want to throw an error
        console.error(
          `Error attempting to delete ${offlineDataStorageDirectory}/${id}: \n\n ${error}`,
        );
      }

      throw new Error(`${filePath} does not exist. Folder deleted.`);
    }

    const json = await readAsStringAsync(filePath);

    if (pickupIndex) {
      return JSON.parse(json).pickups[pickupIndex];
    }

    return JSON.parse(json);
  } catch (error) {
    console.error(
      `Error attempting to read offline submission with id: ${id} (pickupIndex: ${pickupIndex}): \n\n ${error}`,
    );

    throw error;
  }
}

async function deleteOfflineSubmission(id) {
  try {
    await deleteAsync(`${offlineDataStorageDirectory}/${id}`);
  } catch (error) {
    console.error(
      `Error attempting to delete offline submission with id: ${id}: \n\n ${error}`,
    );
    Sentry.captureException(error);
  }
}

export function OfflineCacheContextProvider({ children }) {
  const { isInternetReachable } = useNetInfo();
  const [cachedSubmissionIds, setCachedSubmissionIds] = useState([]);
  const { postReport, postRoute } = useAPI();
  const { authInfo, isReady } = useAuth();

  const refreshCachedSubmissionIds = async () => {
    const folderNames = await readDirectoryAsync(offlineDataStorageDirectory);

    // filter out any weird stuff like .DS_Store
    setCachedSubmissionIds(
      folderNames.filter((folderName) => folderName.match(/^\d+$/)),
    );
  };

  useEffect(() => {
    refreshCachedSubmissionIds();
  }, []);

  const submit = async function () {
    if (mutation.isPending) {
      console.warn('already submitting, skipping');

      return;
    }

    console.log('submitting offline submissions...');
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
          const routeResponse = await postRoute(
            lodash.omit(submission, ['pickups']),
          );

          for (let j = 0; j < submission.pickups.length; j++) {
            const pickup = submission.pickups[j];
            delete pickup.offlineStorageId;
            pickup.route_id = routeResponse.route_id;

            /*
              If the postReport fails, we cache the report and still delete the route since it was submitted successfully above, otherwise this creates a duplicate route when it attempts to submit again
            */
            try {
              await postReport(pickup, config.REPORT_TYPES.pickup);
            } catch (error) {
              await cacheReport(pickup);
              Sentry.captureException(error);
              console.error(error);
              lastError = error.message;
            }
          }
        }

        await deleteOfflineSubmission(cachedSubmissionIds[i]);
      } catch (error) {
        Sentry.captureException(error);
        console.error(error);
        lastError = error.message;
      }
    }

    if (!lastError) {
      Alert.alert(
        t('services.offline.offlineSubmission'),
        t('services.offline.offlineSuccess'),
      );
    } else {
      Alert.alert(t('services.offline.offlineError'), lastError);
    }

    await refreshCachedSubmissionIds();

    return lastError;
  };

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: submit,
    onSuccess: () => {
      queryClient.invalidateQueries(config.QUERY_KEYS.submissions);
      queryClient.invalidateQueries(config.QUERY_KEYS.profile);
    },
  });

  // prevent endless retries...
  const lastTry = useRef();
  useEffect(() => {
    if (
      (!lastTry?.current || lastTry.current < Date.now() - 1000 * 60 * 1) &&
      isInternetReachable &&
      authInfo?.user &&
      cachedSubmissionIds.length > 0 &&
      !mutation.isPending &&
      isReady
    ) {
      lastTry.current = Date.now();
      mutation.mutate();
    }
  }, [
    isInternetReachable,
    authInfo?.user,
    cachedSubmissionIds.length,
    mutation,
    isReady,
  ]);

  useEffect(() => {
    const updateBadgeCount = async () => {
      let badgeNumber = 0;
      if (cachedSubmissionIds && cachedSubmissionIds.length > 0) {
        badgeNumber = cachedSubmissionIds.length;
      }

      let allowed = true;
      if (Platform.OS === 'ios') {
        let status = await Notifications.getPermissionsAsync();
        if (
          status.ios.status ===
          Notifications.IosAuthorizationStatus.NOT_DETERMINED
        ) {
          status = await Notifications.requestPermissionsAsync({
            ios: { allowBadge: true },
          });
        }
        allowed =
          status.ios.status !== Notifications.IosAuthorizationStatus.DENIED;
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
      const fileName = photo.uri.split('/').pop();
      const newUri = `${directory}/${fileName}`;
      await moveAsync({
        from: photo.uri,
        to: newUri,
      });

      // being very careful to create a new object
      // built apps were having troubles with the photo uri update
      const newPhoto = { ...photo, uri: newUri };

      return newPhoto;
    }

    return photo;
  };

  const showAlert = async function (error) {
    await new Promise((resolve) => {
      Alert.alert(
        t('services.offline.offlineReport'),
        (error ? `${errorMessage} \n\n ${error.message}` : offlineMessage) +
          '\n\n' +
          commonMessage,
        [{ text: t('ok'), onPress: resolve }],
      );
    });
  };

  const cacheReport = async function (submitValues, error) {
    const id = new Date().getTime();
    const reportDirectory = `${offlineDataStorageDirectory}/${id}`;
    await makeDirectoryAsync(reportDirectory);

    submitValues.offlineStorageId = id;

    try {
      submitValues.photo = await movePhoto(submitValues.photo, reportDirectory);

      await writeAsStringAsync(
        `${reportDirectory}/${dataFileName}`,
        JSON.stringify(submitValues),
      );

      await refreshCachedSubmissionIds();
    } catch (error) {
      console.warning(
        `error caching report, deleting directory ${reportDirectory}`,
      );
      await deleteAsync(reportDirectory);

      throw error;
    }

    if (error) {
      await showAlert(error);
    }
  };

  const cacheRoute = async function (submitValues, pickups, error) {
    const id = new Date().getTime();
    const routeDirectory = `${offlineDataStorageDirectory}/${id}`;
    await makeDirectoryAsync(routeDirectory);

    submitValues.offlineStorageId = id;

    // being very careful to create new objects and array
    // built apps were having troubles with the photo uri update
    const newPickups = [];
    for (let i = 0; i < pickups.length; i++) {
      const photo = await movePhoto(pickups[i].photo, routeDirectory);

      newPickups.push({ ...pickups[i], photo });
    }

    await writeAsStringAsync(
      `${routeDirectory}/${dataFileName}`,
      JSON.stringify({ ...submitValues, pickups: newPickups }),
    );

    await refreshCachedSubmissionIds();

    if (error) {
      await showAlert(error);
    }
  };

  return (
    <OfflineCacheContext.Provider
      value={{
        isConnected: isInternetReachable,
        cacheReport,
        cacheRoute,
        cachedSubmissionIds,
        submitOfflineSubmissions: mutation.mutate.bind(mutation),
        isSubmitting: mutation.isPending,
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
  const context = useContext(OfflineCacheContext);
  if (!context) {
    throw new Error(
      'useOfflineCache must be used within a OfflineCacheContextProvider component',
    );
  }
  return context;
}
