import { length, lineString } from '@turf/turf';
import { Button, Card, Modal, Text, useTheme } from '@ui-kitten/components';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { pick } from 'lodash';
import propTypes from 'prop-types';
import React, { useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import * as Sentry from 'sentry-expo';
import backgroundLocationService from '../services/backgroundLocation';
import { PADDING } from '../services/styles';

const BACKGROUND_TASK_NAME = 'wvcr-vehicle-tracking-task';

TaskManager.defineTask(BACKGROUND_TASK_NAME, async ({ data, error }) => {
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
  removals: [],

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

    case 'ADD_REMOVAL':
      // TODO: cache in some sort of local storage so that the app can crash and they won't loose data?
      draft.removals.push(action.removal);

      break;

    case 'ADD_ROUTE_COORDINATES':
      // TODO: cache in some sort of local storage so that the app can crash and they won't loose data?
      draft.routeCoordinates = draft.routeCoordinates.concat(action.payload);

      break;
    case 'RESET':
      // clear local storage backup
      return initialVehicleTrackingState;

    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }

  // derived...
  draft.isPaused = draft.status === 'paused';
  draft.isTracking = draft.status === 'tracking' || draft.isPaused;
};

async function verifyPermissions() {
  console.log('verifyPermissions');
  const result = await Location.requestBackgroundPermissionsAsync();

  if (!result.granted) {
    Alert.alert('Error', 'Background location permissions are required to record vehicle routes.', [
      { text: 'OK', onPress: () => Linking.openSettings() },
    ]);

    return false;
  }

  const enabled = await Location.hasServicesEnabledAsync();

  if (!enabled) {
    Alert.alert('Error', 'Location services are required to record vehicle routes.', [
      { text: 'OK', onPress: () => Linking.openSettings() },
    ]);

    return false;
  }

  return true;
}

const getDistance = (coords) => {
  if (coords.length < 2) {
    return 'n/a';
  }

  const arrayCoords = coords.map(({ latitude, longitude }) => [longitude, latitude]);

  const line = lineString(arrayCoords);

  const miles = length(line, { units: 'miles' });

  return `${miles.toFixed(2)} miles`;
};

export default function VehicleTracking({ state, dispatch }) {
  const theme = useTheme();

  const onNewLocations = (locations) => {
    dispatch({
      type: 'ADD_ROUTE_COORDINATES',
      payload: locations.map((location) => pick(location.coords, 'latitude', 'longitude')),
    });
  };

  const startTracking = async () => {
    console.log('startTracking');
    backgroundLocationService.subscribe(onNewLocations);

    await Location.startLocationUpdatesAsync(BACKGROUND_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      deferredUpdatesInterval: 2000,
      showsBackgroundLocationIndicator: true,
    });
  };

  useEffect(() => {
    return () => {
      backgroundLocationService.unsubscribe();
    };
  }, []);

  const stopTracking = async () => {
    console.log('stopTracking');

    backgroundLocationService.unsubscribe();

    await Location.stopLocationUpdatesAsync(BACKGROUND_TASK_NAME);
  };

  const startRoute = async () => {
    console.log('startRoute');
    if (await verifyPermissions()) {
      await startTracking();

      dispatch({ type: 'START' });
    }
  };

  const pauseRoute = async () => {
    console.log('pauseRoute');

    await stopTracking();

    dispatch({ type: 'PAUSE' });
  };

  const resumeRoute = async () => {
    console.log('resumeRoute');

    await startTracking();

    dispatch({ type: 'RESUME' });
  };

  const completeRoute = async () => {
    console.log('completeRoute');

    await stopTracking();

    // TODO: submit data
    console.log('vehicle tracking state', {
      start: state.start,
      end: new Date(),
      routeCoordinates: state.routeCoordinates,
      removals: state.removals,
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
          <Text>Removals: {state.removals.length}</Text>
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
