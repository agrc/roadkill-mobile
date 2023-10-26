import AsyncStorage from '@react-native-async-storage/async-storage';
import { length, lineString } from '@turf/turf';
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
import * as TaskManager from 'expo-task-manager';
import propTypes from 'prop-types';
import React, { useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from 'react-query';
import * as Sentry from 'sentry-expo';
import { useAPI } from '../services/api';
import backgroundLocationService from '../services/backgroundLocation';
import config from '../services/config';
import { getIcon } from '../services/icons';
import { useOfflineCache } from '../services/offline';
import { PADDING, RADIUS } from '../services/styles';
import {
  appendCoordinates,
  dateToString,
  lineCoordinatesToString,
} from '../services/utilities';
import Spinner from './Spinner';

const STORAGE_KEY = 'wvcr-vehicle-tracking-state';

TaskManager.defineTask(
  backgroundLocationService.taskName,
  async ({ data, error }) => {
    if (error) {
      console.log(error);
      Sentry.captureException(error);

      return;
    }

    if (data) {
      const { locations } = data;

      if (locations) {
        backgroundLocationService.notify(locations);
      }
    }
  },
);

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
      draft.start = new Date();

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
    case 'RESET':
      AsyncStorage.removeItem(STORAGE_KEY);

      return initialVehicleTrackingState;

    case 'RESTORE_FROM_STORAGE':
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

  return `${miles.toFixed(2)} miles`;
};

export default function VehicleTracking({
  state,
  dispatch,
  startTracking,
  resumeRoute,
}) {
  const theme = useTheme();

  useEffect(() => {
    return () => {
      backgroundLocationService.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const checkStorage = async () => {
      const backup = await AsyncStorage.getItem(STORAGE_KEY);

      if (backup && JSON.stringify(state) !== backup) {
        const parsedBackup = JSON.parse(backup);
        parsedBackup.start = new Date(parsedBackup.start);

        dispatch({ type: 'RESTORE_FROM_STORAGE', payload: parsedBackup });

        if (parsedBackup.isTracking && !parsedBackup.isPaused) {
          startTracking();
        }
      }
    };

    checkStorage();
  }, []);

  const stopTracking = async () => {
    console.log('stopTracking');

    backgroundLocationService.unsubscribe();

    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(
        backgroundLocationService.taskName,
      );

      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(
          backgroundLocationService.taskName,
        );
      }
    } catch (error) {
      console.log(error);
      Sentry.captureException(error);
    }
  };

  const pauseRoute = async () => {
    console.log('pauseRoute');

    await stopTracking();

    dispatch({ type: 'PAUSE' });
  };

  const cancelRoute = () => {
    console.log('cancelRoute');

    Alert.alert(
      'Are you sure?',
      "Canceled routes are deleted and can't be submitted.",
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Discard route',
          onPress: async () => {
            await stopTracking();

            dispatch({ type: 'RESET' });
          },
        },
      ],
    );
  };

  const { postReport, postRoute } = useAPI();
  const completeRoute = async () => {
    console.log('completeRoute');

    await stopTracking();

    dispatch({ type: 'HIDE' });

    mutation.mutate();
  };

  const confirmCompleteRoute = () => {
    if (state.routeCoordinates.length < 2) {
      Alert.alert(
        'You must have tracked at least two positions to submit a route!',
      );

      return;
    }

    Alert.alert(
      'Are you sure?',
      `Are you sure that you want to stop tracking and submit this route with ${state.pickups.length} pickups?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Submit route',
          onPress: completeRoute,
        },
      ],
    );
  };
  const [spinnerMessage, setSpinnerMessage] = React.useState('');

  const { isConnected, cacheRoute, cacheReport } = useOfflineCache();
  const submitRoute = async () => {
    const submitValues = {
      start_time: state.start,
      end_time: new Date(),
      geog: lineCoordinatesToString(state.routeCoordinates),
      submit_date: new Date().toISOString(),
    };

    if (!isConnected) {
      await cacheRoute(submitValues, state.pickups);

      dispatch({ type: 'RESET' });

      return;
    }

    setSpinnerMessage('submitting route...');

    let responseJson;
    try {
      responseJson = await postRoute(submitValues);
    } catch (error) {
      await cacheRoute(submitValues, state.pickups, error);

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
        `submitting pickup ${index + 1} of ${state.pickups.length}...`,
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
        'Error',
        `Your route has been submitted successfully, but there were errors submitting your pickups. They have been cached on your device for later submission. \n\n${submitErrors
          .map((error) => error.message)
          .join('\n')}`,
      );
    } else {
      Alert.alert('Success!', 'Your route has been submitted successfully.');
    }
  };

  const queryClient = useQueryClient();
  const mutation = useMutation(submitRoute, {
    onSuccess: () => {
      queryClient.invalidateQueries(config.QUERY_KEYS.submissions);
      queryClient.invalidateQueries(config.QUERY_KEYS.profile);

      dispatch({ type: 'RESET' });
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
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
          <Text>Start: {state.start ? dateToString(state.start) : null}</Text>
          <Text>Status: {state.status}</Text>
          <Text>Distance: {getDistance(state.routeCoordinates)}</Text>
          <Text>Pickups: {state.pickups?.length}</Text>
          <Divider style={styles.divider} />
          {state.isPaused ? (
            <Button style={styles.button} onPress={resumeRoute}>
              Resume
            </Button>
          ) : (
            <Button style={styles.button} onPress={pauseRoute} status="danger">
              Pause Route
            </Button>
          )}
          <Button
            style={styles.button}
            onPress={confirmCompleteRoute}
            status="info"
          >
            Finish and Submit Route
          </Button>
          <Button
            style={styles.button}
            onPress={cancelRoute}
            appearance="ghost"
          >
            Cancel Route
          </Button>
        </Card>
      </Modal>
      <Spinner show={mutation.isLoading} message={spinnerMessage} />
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
