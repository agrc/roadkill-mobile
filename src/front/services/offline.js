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
} from 'expo-file-system/legacy';
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
const offlineRecordMarker = '__roadkillOfflineRecord';

const queueOwnersMatch = (queuedOwner, currentOwner) =>
  Boolean(
    queuedOwner?.userId &&
      currentOwner?.userId &&
      queuedOwner.providerName === currentOwner.providerName &&
      queuedOwner.subject === currentOwner.subject &&
      String(queuedOwner.userId) === String(currentOwner.userId),
  );

const queueOwnersHaveSameIdentityWithDifferentUserIds = (queuedOwner, currentOwner) =>
  Boolean(
    queuedOwner?.userId &&
      currentOwner?.userId &&
      queuedOwner?.providerName &&
      queuedOwner?.subject &&
      currentOwner?.providerName &&
      currentOwner?.subject &&
      queuedOwner.providerName === currentOwner.providerName &&
      queuedOwner.subject === currentOwner.subject &&
      String(queuedOwner.userId) !== String(currentOwner.userId),
  );

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

export async function getOfflineSubmissionRecord(id) {
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
    const record = JSON.parse(json);

    if (record?.[offlineRecordMarker] === 1 && record.submission) {
      return {
        submission: record.submission,
        owner: record.owner ?? null,
        isLegacy: false,
      };
    }

    return { submission: record, owner: null, isLegacy: true };
  } catch (error) {
    console.error(
    `Error attempting to read offline submission with id: ${id}: \n\n ${error}`,
    );

    throw error;
  }
}

async function writeOfflineSubmissionRecord(id, submission, owner) {
  await writeAsStringAsync(
    `${offlineDataStorageDirectory}/${id}/${dataFileName}`,
    JSON.stringify({
      [offlineRecordMarker]: 1,
      owner: owner ?? null,
      submission,
    }),
  );
}

export async function getOfflineSubmission(id, pickupIndex) {
  const { submission } = await getOfflineSubmissionRecord(id);

  if (pickupIndex) return submission.pickups[pickupIndex];

  return submission;
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
  const {
    authInfo,
    isReady,
    getSessionSnapshot,
    getSessionOwner,
    getLegacyQueueOwner,
    isSessionCurrent,
  } = useAuth();
  const [ownershipIssueCount, setOwnershipIssueCount] = useState(0);
  const autoPausedOwner = useRef(null);
  const previousConnectivity = useRef(isInternetReachable);
  const lastTry = useRef();

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

  const cachedIdsKey = cachedSubmissionIds.join('|');
  const currentOwnerKey = [
    authInfo?.providerName,
    authInfo?.oauthUser?.sub,
    authInfo?.user?.id,
  ].join(':');

  useEffect(() => {
    let active = true;
    const updateOwnershipIssues = async () => {
      const currentOwner =
        authInfo?.registered && authInfo.user?.id
          ? {
              providerName: authInfo.providerName,
              subject: authInfo.oauthUser?.sub,
              userId: String(authInfo.user.id),
            }
          : null;
      const ids = cachedIdsKey ? cachedIdsKey.split('|') : [];
      const records = await Promise.all(
        ids.map((id) => getOfflineSubmissionRecord(id)),
      );
      const issueCount = records.filter(
        (record) => !queueOwnersMatch(record.owner, currentOwner),
      ).length;

      if (active) setOwnershipIssueCount(issueCount);
    };

    if (!cachedSubmissionIds.length) {
      setOwnershipIssueCount(0);
    } else {
      updateOwnershipIssues();
    }

    return () => {
      active = false;
    };
  }, [
    authInfo?.oauthUser?.sub,
    authInfo?.providerName,
    authInfo?.registered,
    authInfo?.user?.id,
    cachedIdsKey,
    cachedSubmissionIds.length,
    currentOwnerKey,
  ]);

  useEffect(() => {
    if (!previousConnectivity.current && isInternetReachable) {
      autoPausedOwner.current = null;
      lastTry.current = null;
    }
    previousConnectivity.current = isInternetReachable;
  }, [isInternetReachable]);

  const confirmUnownedSubmissions = () =>
    new Promise((resolve) => {
      Alert.alert(
        t('services.offline.unownedTitle'),
        t('services.offline.unownedDescription'),
        [
          { text: t('cancel'), style: 'cancel', onPress: () => resolve(false) },
          { text: t('services.offline.submitAsCurrentUser'), onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });

  const confirmSameIdentityReassignment = () =>
    new Promise((resolve) => {
      Alert.alert(
        t('services.offline.reassignTitle'),
        t('services.offline.reassignDescription'),
        [
          { text: t('cancel'), style: 'cancel', onPress: () => resolve(false) },
          { text: t('services.offline.submitAsCurrentUser'), onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });

  const assertSessionCurrent = (expectedSession) => {
    const currentSession = getSessionSnapshot();
    if (
      !currentSession ||
      currentSession.generation !== expectedSession.generation ||
      !queueOwnersMatch(currentSession.owner, expectedSession.owner) ||
      !isSessionCurrent(expectedSession)
    ) {
      const error = new Error('The sign-in session changed during submission.');
      error.code = 'SESSION_CHANGED';
      throw error;
    }
  };

  const submit = async function ({ explicit = false } = {}) {
    if (mutation.isPending) {
      console.warn('already submitting, skipping');

      return;
    }

    const sessionSnapshot = getSessionSnapshot();
    const originalLegacyOwner = getLegacyQueueOwner();
    if (explicit) autoPausedOwner.current = null;
    if (!sessionSnapshot) {
      Alert.alert(
        t('services.offline.offlineError'),
        t('services.offline.signInBeforeSubmit'),
      );
      return t('services.offline.signInBeforeSubmit');
    }

    console.log('submitting offline submissions...');
    let lastError;
    let issueCount = 0;
    let confirmedUnowned = false;
    let confirmedSameIdentityReassignment = false;
    let stopAfterCurrent = false;
    let ownershipPaused = false;
    let outagePaused = false;
    let confirmationCancelled = false;
    for (let i = 0; i < cachedSubmissionIds.length; i++) {
      const id = cachedSubmissionIds[i];
      try {
        console.log(`submitting: ${id}`);
        const record = await getOfflineSubmissionRecord(id);
        const submission = { ...record.submission };
        let owner = record.owner;

        if (!owner) {
          if (record.isLegacy && originalLegacyOwner?.userId) {
            owner = originalLegacyOwner;
          } else if (explicit && !confirmedUnowned) {
            confirmedUnowned = await confirmUnownedSubmissions();
            if (!confirmedUnowned) {
              confirmationCancelled = true;
              lastError = t('services.offline.ownershipConfirmationCancelled');
              break;
            }
            owner = sessionSnapshot.owner;
          } else if (confirmedUnowned) {
            owner = sessionSnapshot.owner;
          }

          if (owner) {
            assertSessionCurrent(sessionSnapshot);
            await writeOfflineSubmissionRecord(id, submission, owner);
          }
        }

        if (
          explicit &&
          owner &&
          !queueOwnersMatch(owner, sessionSnapshot.owner) &&
          queueOwnersHaveSameIdentityWithDifferentUserIds(
            owner,
            sessionSnapshot.owner,
          )
        ) {
          if (!confirmedSameIdentityReassignment) {
            confirmedSameIdentityReassignment =
              await confirmSameIdentityReassignment();
            if (!confirmedSameIdentityReassignment) {
              confirmationCancelled = true;
              lastError = t('services.offline.ownershipConfirmationCancelled');
              break;
            }
          }

          assertSessionCurrent(sessionSnapshot);
          owner = sessionSnapshot.owner;
          await writeOfflineSubmissionRecord(id, submission, owner);
        }

        if (!queueOwnersMatch(owner, sessionSnapshot.owner)) {
          issueCount++;
          ownershipPaused = true;
          lastError = t('services.offline.ownerMismatch');
          continue;
        }

        assertSessionCurrent(sessionSnapshot);

        delete submission.offlineStorageId;
        if (submission.animal_location) {
          // report
          if (isPickupReport(submission)) {
            await postReport(submission, config.REPORT_TYPES.pickup, sessionSnapshot);
          } else {
            await postReport(submission, config.REPORT_TYPES.report, sessionSnapshot);
          }
        } else {
          // route
          const routeResponse = await postRoute(
            lodash.omit(submission, ['pickups']),
            sessionSnapshot,
          );

          for (let j = 0; j < (submission.pickups ?? []).length; j++) {
            const pickup = { ...submission.pickups[j] };
            delete pickup.offlineStorageId;
            pickup.route_id = routeResponse.route_id;

            if (!isSessionCurrent(sessionSnapshot)) {
              for (let remaining = j; remaining < submission.pickups.length; remaining++) {
                const pendingPickup = { ...submission.pickups[remaining] };
                delete pendingPickup.offlineStorageId;
                pendingPickup.route_id = routeResponse.route_id;
                await cacheReport(pendingPickup, null, owner);
              }
              issueCount++;
              ownershipPaused = true;
              lastError = t('services.offline.ownerMismatch');
              stopAfterCurrent = true;
              break;
            }

            /*
              If the postReport fails, we cache the report and still delete the route since it was submitted successfully above, otherwise this creates a duplicate route when it attempts to submit again
            */
            try {
              await postReport(
                pickup,
                config.REPORT_TYPES.pickup,
                sessionSnapshot,
              );
            } catch (error) {
              await cacheReport(pickup, null, owner);
              if (!error.__sentryCaptured && !isExpectedSubmissionError(error)) {
                error.__sentryCaptured = true;
                Sentry.captureException(error);
              }
              console.error(error);
              lastError = error.message;
              if (shouldStopBatch(error)) {
                outagePaused =
                  (error?.status >= 500 && error?.status < 600) ||
                  error?.message === 'Network request failed';
                for (let remaining = j + 1; remaining < submission.pickups.length; remaining++) {
                  const pendingPickup = { ...submission.pickups[remaining] };
                  delete pendingPickup.offlineStorageId;
                  pendingPickup.route_id = routeResponse.route_id;
                  await cacheReport(pendingPickup, null, owner);
                }
                issueCount++;
                stopAfterCurrent = true;
                break;
              }
            }
          }
        }

        await deleteOfflineSubmission(id);
        if (stopAfterCurrent) break;
      } catch (error) {
        if (!error.__sentryCaptured && !isExpectedSubmissionError(error)) {
          error.__sentryCaptured = true;
          Sentry.captureException(error);
        }
        console.error(error);
        lastError = error.message;
        if (shouldStopBatch(error)) {
          outagePaused =
            (error?.status >= 500 && error?.status < 600) ||
            error?.message === 'Network request failed';
          break;
        }
      }
    }

    setOwnershipIssueCount(issueCount);
    if (ownershipPaused || outagePaused) {
      autoPausedOwner.current = currentOwnerKey;
    } else if (explicit || issueCount === 0) {
      autoPausedOwner.current = null;
    }

    if (explicit && !confirmationCancelled) {
      if (!lastError) {
        Alert.alert(
          t('services.offline.offlineSubmission'),
          t('services.offline.offlineSuccess'),
        );
      } else {
        Alert.alert(t('services.offline.offlineError'), lastError);
      }
    }

    await refreshCachedSubmissionIds();

    return lastError;
  };

  const isExpectedSubmissionError = (error) =>
    ['AUTH_REQUIRED', 'AUTH_CANCELLED', 'SESSION_CHANGED', 'OWNER_MISMATCH'].includes(
      error?.code,
    ) ||
    (error?.status === 401 && error?.data?.error === 'invalid_token') ||
    (error?.status === 403 &&
      error?.data?.error === 'registration_required');

  const shouldStopBatch = (error) =>
    isExpectedSubmissionError(error) ||
    (error?.status >= 500 && error?.status < 600) ||
    error?.message === 'Network request failed';

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: submit,
    onSuccess: () => {
      queryClient.invalidateQueries(config.QUERY_KEYS.submissions);
      queryClient.invalidateQueries(config.QUERY_KEYS.profile);
    },
  });

  // prevent endless retries...
  useEffect(() => {
    if (
      (!lastTry?.current || lastTry.current < Date.now() - 1000 * 60 * 1) &&
      isInternetReachable &&
      authInfo?.registered &&
      authInfo?.user?.id &&
      !authInfo?.sessionRecovery &&
      autoPausedOwner.current !== currentOwnerKey &&
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
    authInfo?.registered,
    authInfo?.sessionRecovery,
    cachedSubmissionIds.length,
    currentOwnerKey,
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

  const cacheReport = async function (submitValues, error, ownerOverride) {
    const owner = ownerOverride ?? getSessionOwner();
    const id = new Date().getTime();
    const reportDirectory = `${offlineDataStorageDirectory}/${id}`;
    await makeDirectoryAsync(reportDirectory);

    const queuedSubmission = { ...submitValues, offlineStorageId: id };

    try {
      queuedSubmission.photo = await movePhoto(
        queuedSubmission.photo,
        reportDirectory,
      );

      await writeOfflineSubmissionRecord(id, queuedSubmission, owner);

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
    const owner = getSessionOwner();
    const id = new Date().getTime();
    const routeDirectory = `${offlineDataStorageDirectory}/${id}`;
    await makeDirectoryAsync(routeDirectory);

    const queuedRoute = { ...submitValues, offlineStorageId: id };

    // being very careful to create new objects and array
    // built apps were having troubles with the photo uri update
    const newPickups = [];
    for (let i = 0; i < pickups.length; i++) {
      const photo = await movePhoto(pickups[i].photo, routeDirectory);

      newPickups.push({ ...pickups[i], photo });
    }

    await writeOfflineSubmissionRecord(
      id,
      { ...queuedRoute, pickups: newPickups },
      owner,
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
        ownershipIssueCount,
        submitOfflineSubmissions: () => mutation.mutate({ explicit: true }),
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
