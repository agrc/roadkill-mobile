import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { lineString } from '@turf/helpers';
import { length } from '@turf/length';
import {
  Button,
  Card,
  Divider,
  Modal,
  Text,
  useTheme,
} from '@ui-kitten/components';
import CheapRuler from 'cheap-ruler';
import * as Location from 'expo-location';
import propTypes from 'prop-types';
import React, { useEffect } from 'react';
import { Alert, AppState, StyleSheet, View } from 'react-native';
import { useAPI } from '../services/api';
import backgroundLocationService from '../services/backgroundLocation';
import config from '../services/config';
import { getIcon } from '../services/icons';
import t from '../services/localization';
import { useOfflineCache } from '../services/offline';
import { PADDING, RADIUS } from '../services/styles';
import {
  clearVehicleTrackingSession,
  flushVehicleTrackingLocationWrites,
  getVehicleTrackingPoints,
  getVehicleTrackingSession,
  MAX_TRACKING_DURATION_REASON,
  restoreVehicleTrackingSession,
  setVehicleTrackingSessionStatus,
} from '../services/vehicleTrackingStorage';
import {
  appendCoordinates,
  dateToString,
  lineCoordinatesToString,
} from '../services/utilities';
import Spinner from './Spinner';

const STORAGE_KEY = 'wvcr-vehicle-tracking-state';

const buttonStatuses = {
  idle: 'basic',
  tracking: 'success',
  paused: 'danger',
};

export const initialVehicleTrackingState = {
  status: 'idle',
  isModalVisible: false,
  routeCoordinates: [],
  start: null,
  pickups: [],

  // these are derived...
  isPaused: false,
  isTracking: false,
  buttonStatus: buttonStatuses.idle,
};

export const vehicleTrackingReducer = (draft, action) => {
  switch (action.type) {
    case 'SHOW':
      draft.isModalVisible = true;

      break;

    case 'HIDE':
      draft.isModalVisible = false;

      break;

    case 'START':
      draft.status = 'tracking';
      draft.start = action.payload || new Date();

      break;

    case 'PAUSE':
      draft.status = 'paused';
      draft.isModalVisible = false;

      break;

    case 'RESUME':
      draft.status = 'tracking';

      break;

    case 'ADD_PICKUP': {
      draft.pickups.push(action.payload);

      break;
    }

    case 'ADD_ROUTE_COORDINATES':
      if (action.payload.length > 0) {
        draft.routeCoordinates = appendCoordinates(
          draft.routeCoordinates,
          action.payload,
          CheapRuler,
        );
      }

      break;
    case 'REPLACE_ROUTE_COORDINATES':
      draft.routeCoordinates = action.payload;

      break;
    case 'RESET':
      AsyncStorage.removeItem(STORAGE_KEY);

      return initialVehicleTrackingState;

    case 'RESTORE_FROM_STORAGE':
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(action.payload));

      return action.payload;

    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }

  // derived...
  draft.isPaused = draft.status === 'paused';
  draft.isTracking = draft.status === 'tracking' || draft.isPaused;
  draft.buttonStatus = buttonStatuses[draft.status];

  // backup in case phone crashes
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
};

const getDistance = (coords) => {
  if (coords.length < 2) {
    return 'n/a';
  }

  const arrayCoords = coords.map(({ latitude, longitude }) => [
    longitude,
    latitude,
  ]);

  const line = lineString(arrayCoords);

  const miles = length(line, { units: 'miles' });

  return `${miles.toFixed(2)} ${t('components.vehicleTracking.miles')}`;
};

export default function VehicleTracking({
  state,
  dispatch,
  startTracking,
  resumeRoute,
}) {
  const theme = useTheme();
  const lastPointId = React.useRef(0);
  const isHydrated = React.useRef(false);
  const maxDurationHandled = React.useRef(false);
  const restoreStarted = React.useRef(false);
  const syncQueue = React.useRef(Promise.resolve());
  const startTrackingRef = React.useRef(startTracking);
  startTrackingRef.current = startTracking;

  const syncStoredPoints = React.useCallback(() => {
    if (!isHydrated.current) {
      return Promise.resolve();
    }

    const sync = syncQueue.current.then(async () => {
      const points = await getVehicleTrackingPoints(lastPointId.current);

      if (points.length > 0) {
        lastPointId.current = points[points.length - 1].id;
        dispatch({
          type: 'ADD_ROUTE_COORDINATES',
          payload: points.map(({ latitude, longitude }) => ({
            latitude,
            longitude,
          })),
        });
      }

      const session = await getVehicleTrackingSession();
      if (
        session?.pause_reason === MAX_TRACKING_DURATION_REASON &&
        !maxDurationHandled.current
      ) {
        maxDurationHandled.current = true;
        dispatch({ type: 'PAUSE' });
        dispatch({ type: 'SHOW' });
      }
    });

    syncQueue.current = sync.catch((error) => {
      console.error('Unable to restore saved vehicle-tracking points:', error);
      Sentry.captureException(error);
      Alert.alert(t('error'), error.message);
    });

    return syncQueue.current;
  }, [dispatch]);

  useEffect(() => {
    const unsubscribe = backgroundLocationService.subscribe(syncStoredPoints);
    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextAppState) => {
        if (nextAppState === 'active') {
          syncStoredPoints();
        }
      },
    );

    return () => {
      unsubscribe();
      appStateSubscription.remove();
    };
  }, [syncStoredPoints]);

  useEffect(() => {
    if (restoreStarted.current) return;
    restoreStarted.current = true;

    let mounted = true;
    const restore = async () => {
      const backup = await AsyncStorage.getItem(STORAGE_KEY);
      let restoredState = backup
        ? JSON.parse(backup)
        : initialVehicleTrackingState;

      if (restoredState.start) {
        restoredState.start = new Date(restoredState.start);
      }

      let session = await getVehicleTrackingSession();
      if (!session && restoredState.start) {
        await restoreVehicleTrackingSession(
          restoredState.start,
          restoredState.isPaused ? 'paused' : 'tracking',
          restoredState.routeCoordinates || [],
        );
        session = await getVehicleTrackingSession();
      } else if (session) {
        const matchesSession =
          restoredState.start &&
          Number(restoredState.start) === Number(session.started_at);
        await restoreVehicleTrackingSession(
          new Date(Number(session.started_at)),
          session.status,
          matchesSession ? restoredState.routeCoordinates || [] : [],
        );
        session = await getVehicleTrackingSession();
      }

      if (session && ['tracking', 'paused'].includes(session.status)) {
        const matchesSession =
          restoredState.start &&
          Number(restoredState.start) === Number(session.started_at);
        if (!matchesSession) {
          restoredState = { ...initialVehicleTrackingState };
        }

        const points = await getVehicleTrackingPoints();
        restoredState = {
          ...restoredState,
          status: session.status,
          start: new Date(Number(session.started_at)),
          routeCoordinates: points.map(({ latitude, longitude }) => ({
            latitude,
            longitude,
          })),
          isPaused: session.status === 'paused',
          isTracking: true,
          buttonStatus: buttonStatuses[session.status],
          isModalVisible:
            session.pause_reason === MAX_TRACKING_DURATION_REASON ||
            restoredState.isModalVisible,
        };
        lastPointId.current =
          points.length > 0 ? points[points.length - 1].id : 0;
        maxDurationHandled.current =
          session.pause_reason === MAX_TRACKING_DURATION_REASON;

        if (mounted) {
          dispatch({ type: 'RESTORE_FROM_STORAGE', payload: restoredState });
        }
        isHydrated.current = true;
        await syncStoredPoints();

        if (session.status === 'tracking') {
          await startTrackingRef.current(
            restoredState.start,
            restoredState.routeCoordinates,
          );
        }

        return;
      }

      if (backup && mounted) {
        dispatch({ type: 'RESTORE_FROM_STORAGE', payload: restoredState });
      }
      isHydrated.current = true;
      await syncStoredPoints();
    };

    restore().catch((error) => {
      console.error('Unable to restore vehicle-tracking session:', error);
      Sentry.captureException(error);
      if (mounted) {
        Alert.alert(t('error'), error.message);
      }
    });

    return () => {
      mounted = false;
    };
  }, [dispatch, syncStoredPoints]);

  const stopTracking = async () => {
    console.log('stopTracking');

    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(
        backgroundLocationService.taskName,
      );

      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(
          backgroundLocationService.taskName,
        );
      }
      await flushVehicleTrackingLocationWrites();
    } catch (error) {
      console.log(error);
      Sentry.captureException(error);
      throw error;
    }
  };

  const pauseRoute = async () => {
    console.log('pauseRoute');

    try {
      await stopTracking();
      await setVehicleTrackingSessionStatus('paused');
      dispatch({ type: 'PAUSE' });
    } catch (error) {
      Alert.alert(t('error'), error.message);
    }
  };

  const cancelRoute = () => {
    console.log('cancelRoute');

    Alert.alert(
      t('areYouSure'),
      t('components.vehicleTracking.canceledRouteWarning'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('components.vehicleTracking.discardRoute'),
          onPress: async () => {
            try {
              await stopTracking();
              await clearVehicleTrackingSession();
              dispatch({ type: 'RESET' });
            } catch (error) {
              Alert.alert(t('error'), error.message);
            }
          },
        },
      ],
    );
  };

  const { postReport, postRoute } = useAPI();
  const completeRoute = async () => {
    console.log('completeRoute');

    try {
      await stopTracking();
    } catch (error) {
      Alert.alert(t('error'), error.message);

      return;
    }

    dispatch({ type: 'HIDE' });

    mutation.mutate();
  };

  const confirmCompleteRoute = async () => {
    try {
      const points = await getVehicleTrackingPoints();
      if (points.length < 2 && state.routeCoordinates.length < 2) {
        Alert.alert(t('components.vehicleTracking.atLeast'));

        return;
      }

      Alert.alert(
        t('areYouSure'),
        t('components.vehicleTracking.stopTracking', {
          length: state.pickups.length,
        }),
        [
          {
            text: t('cancel'),
            style: 'cancel',
          },
          {
            text: t('components.vehicleTracking.submit'),
            onPress: completeRoute,
          },
        ],
      );
    } catch (error) {
      Alert.alert(t('error'), error.message);
    }
  };
  const [spinnerMessage, setSpinnerMessage] = React.useState('');

  const { isConnected, cacheRoute, cacheReport } = useOfflineCache();
  const submitRoute = async () => {
    const savedPoints = await getVehicleTrackingPoints();
    const routeCoordinates =
      savedPoints.length > 0
        ? savedPoints.map(({ latitude, longitude }) => ({
            latitude,
            longitude,
          }))
        : state.routeCoordinates;
    const submitValues = {
      start_time: state.start,
      end_time: new Date(),
      geog: lineCoordinatesToString(routeCoordinates),
      submit_date: new Date().toISOString(),
    };

    if (!isConnected) {
      await cacheRoute(submitValues, state.pickups);
      await clearVehicleTrackingSession();

      dispatch({ type: 'RESET' });

      return;
    }

    setSpinnerMessage(`${t('components.vehicleTracking.submittingRoute')}...`);

    let responseJson;
    try {
      responseJson = await postRoute(submitValues);
    } catch (error) {
      await cacheRoute(submitValues, state.pickups, error);
      await clearVehicleTrackingSession();

      dispatch({ type: 'RESET' });

      return;
    }

    const submitErrors = [];
    for (let index = 0; index < state.pickups.length; index++) {
      // create a new object since we are adding a prop
      const pickup = {
        ...state.pickups[index],
        route_id: responseJson.route_id,
      };

      setSpinnerMessage(
        `${t('components.vehicleTracking.submittingPickup', {
          num: index + 1,
          total: state.pickups.length,
        })}...`,
      );

      try {
        await postReport(pickup, config.REPORT_TYPES.pickup);
      } catch (error) {
        await cacheReport(pickup, error);
        submitErrors.push(error);
      }
    }

    if (submitErrors.length) {
      Alert.alert(
        t('error'),
        `${t('components.vehicleTracking.submissionError')}\n\n${submitErrors
          .map((error) => error.message)
          .join('\n')}`,
      );
    } else {
      Alert.alert(`${t('success')}!`, t('components.vehicleTracking.success'));
    }

    await clearVehicleTrackingSession();
  };

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: submitRoute,
    onSuccess: () => {
      queryClient.invalidateQueries(config.QUERY_KEYS.submissions);
      queryClient.invalidateQueries(config.QUERY_KEYS.profile);

      dispatch({ type: 'RESET' });
    },
    onError: (error) => {
      Alert.alert(t('error'), error.message);
    },
  });

  const CloseIcon = getIcon({
    pack: 'material-community',
    name: 'close',
    size: 25,
    color: theme['color-basic-700'],
  });
  const getHeader = (title) => (
    <View>
      <View style={styles.header}>
        <Text category="h5">{title}</Text>
        <Button
          accessoryLeft={CloseIcon}
          size="tiny"
          appearance="ghost"
          onPress={close}
          style={styles.closeButton}
        />
      </View>
    </View>
  );

  const close = () => {
    console.log('close pressed');
    dispatch({ type: 'HIDE' });
  };

  return (
    <>
      <Modal
        visible={state.isModalVisible}
        backdropStyle={{
          backgroundColor: theme['color-basic-transparent-600'],
        }}
        onBackdropPress={close}
        style={styles.modal}
      >
        <Card disabled={true} header={getHeader('Route')} style={styles.modal}>
          <Text>
            {t('components.vehicleTracking.start')}:{' '}
            {state.start ? dateToString(state.start) : null}
          </Text>
          <Text>
            {t('components.vehicleTracking.status')}: {state.status}
          </Text>
          <Text>
            {t('components.vehicleTracking.distance')}:{' '}
            {getDistance(state.routeCoordinates)}
          </Text>
          <Text>
            {t('components.vehicleTracking.pickups')}: {state.pickups?.length}
          </Text>
          <Divider style={styles.divider} />
          {state.isPaused ? (
            <Button style={styles.button} onPress={resumeRoute}>
              {t('components.vehicleTracking.resume')}
            </Button>
          ) : (
            <Button style={styles.button} onPress={pauseRoute} status="danger">
              {t('components.vehicleTracking.pauseRoute')}
            </Button>
          )}
          <Button
            style={styles.button}
            onPress={confirmCompleteRoute}
            status="info"
          >
            {t('components.vehicleTracking.finishAndSubmit')}
          </Button>
          <Button
            style={styles.button}
            onPress={cancelRoute}
            appearance="ghost"
          >
            {t('components.vehicleTracking.cancel')}
          </Button>
        </Card>
      </Modal>
      <Spinner show={mutation.isPending} message={spinnerMessage} />
    </>
  );
}

VehicleTracking.propTypes = {
  state: propTypes.object.isRequired,
  dispatch: propTypes.func.isRequired,
  startTracking: propTypes.func.isRequired,
  resumeRoute: propTypes.func.isRequired,
};

const styles = StyleSheet.create({
  modal: {
    borderRadius: RADIUS,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    marginVertical: PADDING,
  },
  button: {
    marginTop: PADDING,
  },
  closeButton: {
    marginRight: -10,
  },
});
