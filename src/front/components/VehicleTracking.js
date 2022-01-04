import AsyncStorage from '@react-native-async-storage/async-storage';
import { length, lineString } from '@turf/turf';
import { Button, Card, Modal, Text, useTheme } from '@ui-kitten/components';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import propTypes from 'prop-types';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Sentry from 'sentry-expo';
import backgroundLocationService from '../services/backgroundLocation';
import { PADDING } from '../services/styles';

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

export const initialVehicleTrackingState = {
  status: 'idle',
  isModalVisible: false,
  routeCoordinates: [],
  start: null,
  pickups: [],

  // these are derived...
  isPaused: false,
  isTracking: false,
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

export default function VehicleTracking({ state, dispatch, startTracking, resumeRoute, startRoute }) {
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
      await Location.stopLocationUpdatesAsync(backgroundLocationService.taskName);
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

  const completeRoute = async () => {
    console.log('completeRoute');

    await stopTracking();

    // TODO: submit data
    console.log('vehicle tracking state', {
      start: state.start,
      end: new Date(),
      routeCoordinates: state.routeCoordinates,
      pickups: state.pickups,
    });

    dispatch({ type: 'RESET' });
  };

  const getHeader = (title) => (
    <View style={styles.header}>
      <Text category="h5">{title}</Text>
    </View>
  );

  const Footer = (props) => (
    <View {...props} style={[props.style, styles.footer]}>
      <Button onPress={completeRoute}>Finish</Button>
      {state.isPaused ? <Button onPress={resumeRoute}>Resume</Button> : <Button onPress={pauseRoute}>Pause</Button>}
      <Button onPress={close}>Close</Button>
    </View>
  );

  Footer.propTypes = {
    style: propTypes.array,
  };

  const close = () => {
    console.log('close pressed');
    dispatch({ type: 'HIDE' });
  };

  return (
    <Modal
      visible={state.isModalVisible}
      backdropStyle={{ backgroundColor: theme['color-basic-transparent-600'] }}
      style={styles.modal}
      onBackdropPress={close}
    >
      {state.isTracking ? (
        <Card disabled={true} header={getHeader('Route name/ID')} footer={Footer}>
          <Text>Start: {state.start.toLocaleString()}</Text>
          <Text>Status: {state.status}</Text>
          <Text>Distance: {getDistance(state.routeCoordinates)}</Text>
          <Text>Pickups: {state.pickups?.length}</Text>
        </Card>
      ) : (
        <Card disabled={true} header={getHeader('Vehicle Tracking')}>
          <Button onPress={startRoute}>Start new route</Button>
          <Button onPress={() => dispatch({ type: 'HIDE' })} appearance="ghost">
            Cancel
          </Button>
        </Card>
      )}
    </Modal>
  );
}

VehicleTracking.propTypes = {
  state: propTypes.object.isRequired,
  dispatch: propTypes.func.isRequired,
  startTracking: propTypes.func.isRequired,
  resumeRoute: propTypes.func.isRequired,
  startRoute: propTypes.func.isRequired,
};

const styles = StyleSheet.create({
  header: {
    padding: PADDING,
  },
  modal: {},
  footer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
