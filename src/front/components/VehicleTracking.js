import AsyncStorage from '@react-native-async-storage/async-storage';
import { length, lineString } from '@turf/turf';
import { Button, Card, Divider, Modal, Text, useTheme } from '@ui-kitten/components';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import propTypes from 'prop-types';
import React, { useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from 'react-query';
import * as Sentry from 'sentry-expo';
import { getFormData } from '../screens/Report';
import { useAPI } from '../services/api';
import backgroundLocationService from '../services/backgroundLocation';
import config from '../services/config';
import { getIcon } from '../services/icons';
import { PADDING, RADIUS } from '../services/styles';
import { lineCoordinatesToString } from '../services/utilities';
import Spinner from './Spinner';

const STORAGE_KEY = 'wvcr-vehicle-tracking-state';

TaskManager.defineTask(backgroundLocationService.taskName, async ({ data, error }) => {
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
});

const buttonStatuses = {
  idle: 'basic',
  tracking: 'success',
  paused: 'primary',
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

      break;

    case 'RESUME':
      draft.status = 'tracking';

      break;

    case 'ADD_PICKUP': {
      draft.pickups.push(action.payload);

      break;
    }

    case 'ADD_ROUTE_COORDINATES':
      draft.routeCoordinates = draft.routeCoordinates.concat(action.payload);

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

  const arrayCoords = coords.map(({ latitude, longitude }) => [longitude, latitude]);

  const line = lineString(arrayCoords);

  const miles = length(line, { units: 'miles' });

  return `${miles.toFixed(2)} miles`;
};

export default function VehicleTracking({ state, dispatch, startTracking, resumeRoute }) {
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
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(backgroundLocationService.taskName);

      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(backgroundLocationService.taskName);
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

  const cancelRoute = async () => {
    console.log('cancelRoute');

    await stopTracking();

    dispatch({ type: 'RESET' });
  };

  const { post } = useAPI();
  const completeRoute = async () => {
    console.log('completeRoute');

    await stopTracking();

    dispatch({ type: 'HIDE' });

    mutation.mutate();
  };

  const confirmCompleteRoute = () => {
    Alert.alert(
      'Submit Route',
      `Are you sure that you want to stop tracking and submit this route with ${state.pickups.length} pickups?`,
      [
        {
          text: 'Yes',
          onPress: completeRoute,
        },
        {
          text: 'Cancel',
        },
      ]
    );
  };
  const [spinnerMessage, setSpinnerMessage] = React.useState('');

  const submitRoute = async () => {
    const submitValues = {
      start_time: state.start,
      end_time: new Date(),
      geog: lineCoordinatesToString(state.routeCoordinates),
      submit_date: new Date().toISOString(),
    };

    setSpinnerMessage('submitting route...');

    const responseJson = await post('routes/route', submitValues);

    for (let index = 0; index < state.pickups.length; index++) {
      const pickup = state.pickups[index];

      setSpinnerMessage(`submitting pickup ${index + 1} of ${state.pickups.length}...`);

      await post(
        'reports/pickup',
        getFormData({
          ...pickup,
          route_id: responseJson.route_id,
        }),
        true
      );
    }
  };

  const queryClient = useQueryClient();
  const mutation = useMutation(submitRoute, {
    onSuccess: () => {
      queryClient.invalidateQueries(config.QUERY_KEYS.reports);
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
        <Button accessoryLeft={CloseIcon} size="tiny" appearance="ghost" onPress={close} style={styles.closeButton} />
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
        backdropStyle={{ backgroundColor: theme['color-basic-transparent-600'] }}
        onBackdropPress={close}
        style={styles.modal}
      >
        <Card disabled={true} header={getHeader('Route')} style={styles.modal}>
          <Text>Start: {state.start?.toLocaleString()}</Text>
          <Text>Status: {state.status}</Text>
          <Text>Distance: {getDistance(state.routeCoordinates)}</Text>
          <Text>Pickups: {state.pickups?.length}</Text>
          <Divider style={styles.divider} />
          {state.isPaused ? (
            <Button style={styles.button} onPress={resumeRoute}>
              Resume
            </Button>
          ) : (
            <Button style={styles.button} onPress={pauseRoute} status="primary">
              Pause Route
            </Button>
          )}
          <Button style={styles.button} onPress={confirmCompleteRoute} status="info">
            Finish and Submit Route
          </Button>
          <Button style={styles.button} onPress={cancelRoute} appearance="ghost">
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
