import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@ui-kitten/components';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { pick } from 'lodash';
import propTypes from 'prop-types';
import React from 'react';
import { Alert, AppState, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Marker, Polyline } from 'react-native-maps';
import { useImmerReducer } from 'use-immer';
import useAuth from '../auth/context';
import Map from '../components/Map';
import MapButton from '../components/MapButton';
import RootView from '../components/RootView';
import VehicleTracking, { initialVehicleTrackingState, vehicleTrackingReducer } from '../components/VehicleTracking';
import backgroundLocationService, { verifyPermissions } from '../services/backgroundLocation';
import config from '../services/config';
import { getIcon } from '../services/icons';
import { getLocation, locationToRegion, useFollowUser } from '../services/location';
import { pointStringToCoordinates, wrapAsyncWithDelay } from '../services/utilities';
import Report, { REPORT_TYPES } from './Report';

const initialReportState = {
  reportType: REPORT_TYPES.report,
  showReport: false,
};

const reportReducer = (draft, action) => {
  switch (action.type) {
    case 'show':
      draft.showReport = true;
      draft.reportType = action.meta;

      break;
    case 'hide':
      draft.showReport = false;

      break;
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
};

export default function MainScreen() {
  const navigation = useNavigation();
  const [initialLocation, setInitialLocation] = React.useState(null);
  const appState = React.useRef(AppState.currentState);
  const [showSpinner, setShowSpinner] = React.useState(false);
  const mapView = React.useRef(null);
  const { authInfo } = useAuth();
  // eslint-disable-next-line no-unused-vars
  const [hasUnsubmittedReports, setHasUnsubmittedReports] = React.useState(false);
  const theme = useTheme();
  const mapDimensions = React.useRef(null);
  const [reportHeight, setReportHeight] = React.useState(0);
  const [carcassCoordinates, setCarcassCoordinates] = React.useState(null);
  const [reportState, dispatchReportState] = useImmerReducer(reportReducer, initialReportState);
  const { followUser, stopFollowUser, isFollowing } = useFollowUser(mapView);
  const [vehicleTrackingState, vehicleTrackingDispatch] = useImmerReducer(
    vehicleTrackingReducer,
    initialVehicleTrackingState
  );

  // these three functions had to be hoisted from VehicleTracking
  // so that they could be used in the alerts for contractors in the
  // showAddReport function
  const startTracking = async () => {
    console.log('startTracking');

    const startTime = vehicleTrackingState.start?.getTime() || Date.now();
    backgroundLocationService.subscribe((locations) => {
      if (Date.now() > startTime + config.MAX_TRACKING_TIME) {
        vehicleTrackingDispatch({ type: 'PAUSE' });
        backgroundLocationService.unsubscribe();

        Location.stopLocationUpdatesAsync(backgroundLocationService.taskName);
      }

      vehicleTrackingDispatch({
        type: 'ADD_ROUTE_COORDINATES',
        payload: locations
          // make sure that we don't get any old locations
          .filter((location) => location.timestamp >= startTime)
          .map((location) => pick(location.coords, 'latitude', 'longitude')),
      });
    });

    await Location.startLocationUpdatesAsync(backgroundLocationService.taskName, {
      accuracy: Location.Accuracy.Balanced,
      deferredUpdatesInterval: 2000,
      deferredUpdatesDistance: 20,
      showsBackgroundLocationIndicator: true,
    });
  };

  const startRoute = async () => {
    console.log('startRoute');
    if (await verifyPermissions()) {
      await startTracking();

      vehicleTrackingDispatch({ type: 'START' });
    }
  };

  const resumeRoute = async () => {
    console.log('resumeRoute');

    await startTracking();

    vehicleTrackingDispatch({ type: 'RESUME' });
  };

  const onRouteButtonPress = async () => {
    console.log('vehicleTrackingState.status', vehicleTrackingState.status);
    switch (vehicleTrackingState.status) {
      case 'tracking':
        vehicleTrackingDispatch({ type: 'SHOW' });
        break;
      case 'paused':
        await resumeRoute();
        break;
      case 'idle':
        await startRoute();
        break;
    }
  };

  const initLocation = async () => {
    const result = await Location.requestForegroundPermissionsAsync();
    if (!result.granted) {
      Alert.alert('Error', 'Location permissions are required to submit reports.', [
        { text: 'OK', onPress: () => Linking.openSettings() },
      ]);

      return;
    }

    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      Alert.alert('Error', 'Location services are required to submit reports.', [
        { text: 'OK', onPress: () => Linking.openSettings() },
      ]);
    }

    const location = await getLocation();

    setInitialLocation(location);
  };

  const handleAppStateChange = async (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active' && !initialLocation) {
      await wrapAsyncWithDelay(
        initLocation,
        () => setShowSpinner(true),
        () => setShowSpinner(false),
        config.SPINNER_DELAY
      );
    }

    appState.current = nextAppState;
  };

  React.useEffect(() => {
    const handle = AppState.addEventListener('change', handleAppStateChange);

    wrapAsyncWithDelay(
      initLocation,
      () => setShowSpinner(true),
      () => setShowSpinner(false),
      config.SPINNER_DELAY
    );

    return () => handle?.remove();
  }, []);

  const setMarker = async () => {
    const points = { ...crosshairCoordinates };

    if (Platform.OS === 'android') {
      points.y = points.y * ZOOM_FACTOR;
      points.x = points.x * ZOOM_FACTOR;
    }

    const coordinates = await mapView.current.coordinateForPoint(points);

    setCarcassCoordinates(coordinates);
  };

  const showAddReport = () => {
    const displayReport = (newReportType) => {
      dispatchReportState({
        type: 'show',
        meta: newReportType,
      });

      const zoom = async () => {
        await followUser(config.MAX_ZOOM_LEVEL);
      };

      if (Platform.OS === 'android') {
        // give map padding time to catch up
        setTimeout(zoom, 350);
      } else {
        zoom();
      }
    };

    if (authInfo.user.role === config.USER_TYPES.public) {
      displayReport(REPORT_TYPES.report);
    } else if (authInfo.user.role === config.USER_TYPES.agency || authInfo.user.role === config.USER_TYPES.admin) {
      Alert.alert('I would like to...', null, [
        {
          text: 'Report and pick up a carcass',
          onPress: () => displayReport(REPORT_TYPES.pickup),
        },
        {
          text: 'Report a carcass',
          onPress: () => displayReport(REPORT_TYPES.report),
        },
      ]);
    } else {
      // contractor
      if (!vehicleTrackingState.isTracking) {
        Alert.alert(
          'No vehicle tracking route found',
          'A vehicle tracking route must be started to report a carcass.\n\nWould you like to start a route?',
          [
            {
              text: 'Start route',
              onPress: () => {
                startRoute();

                displayReport(REPORT_TYPES.pickup);
              },
            },
            {
              text: 'Cancel',
            },
          ]
        );

        return;
      }

      if (vehicleTrackingState.isTracking && vehicleTrackingState.isPaused) {
        Alert.alert(
          'Paused vehicle tracking route',
          'A vehicle tracking route has been started but it is currently paused.\n\nWould you to resume?',
          [
            {
              text: 'Resume tracking',
              onPress: () => {
                resumeRoute();

                displayReport(REPORT_TYPES.pickup);
              },
            },
            {
              text: 'Cancel',
            },
          ]
        );

        return;
      }

      displayReport(REPORT_TYPES.pickup);
    }
  };

  const onRegionChange = (_, event) => {
    if (isFollowing && event.isGesture) {
      stopFollowUser();
    }
  };

  const hideAddReport = () => {
    dispatchReportState({
      type: 'hide',
    });
    setCarcassCoordinates(null);
  };

  const { height, width } = useWindowDimensions();
  const ZOOM_FACTOR = 1.3;
  const mapSizeStyle = {
    ...Platform.select({
      ios: {
        height,
        width,
      },
      android: {
        // the cache tiles look super-pixelated on android, this is a hack to help them look better
        height: height * ZOOM_FACTOR,
        width: width * ZOOM_FACTOR,
        marginTop: -(height * ZOOM_FACTOR - height) / 2,
        marginLeft: -(width * ZOOM_FACTOR - width) / 2,
        transform: [{ scale: 1 / ZOOM_FACTOR }],
      },
    }),
  };

  const CrosshairIcon = getIcon({
    pack: 'font-awesome-5',
    name: 'crosshairs',
    size: CROSSHAIR_SIZE,
    color: theme['color-basic-900'],
  });

  const crosshairCoordinates = mapDimensions.current
    ? Platform.select({
        ios: {
          y: (mapDimensions.current.height - reportHeight) / 2,
          x: mapDimensions.current.width / 2,
        },
        android: {
          y: (mapDimensions.current.height - reportHeight) / 2 / ZOOM_FACTOR,
          x: mapDimensions.current.width / 2 / ZOOM_FACTOR,
        },
      })
    : null;

  return (
    <RootView showSpinner={showSpinner} spinnerMessage="getting current location" style={styles.root}>
      {initialLocation ? (
        <>
          <Map
            initialRegion={locationToRegion(initialLocation)}
            onRegionChange={onRegionChange}
            mapPadding={
              reportState.showReport
                ? Platform.select({
                    ios: {
                      bottom: reportHeight + 15,
                    },
                    android: {
                      bottom: reportHeight,
                    },
                  })
                : null
            }
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              mapDimensions.current = { width, height };
            }}
            innerRef={mapView}
            style={[styles.map, mapSizeStyle]}
            showsUserLocation={true}
          >
            {vehicleTrackingState.routeCoordinates?.length ? (
              <Polyline
                coordinates={vehicleTrackingState.routeCoordinates}
                strokeColor="navy"
                strokeWidth={8}
                zIndex={1}
              />
            ) : null}
            {vehicleTrackingState.pickups?.length > 0
              ? vehicleTrackingState.pickups.map((pickup) => (
                  <Marker
                    coordinate={pointStringToCoordinates(pickup.animal_location)}
                    key={pickup.submit_date}
                    zIndex={2}
                    pinColor="navy"
                  />
                ))
              : null}
            {carcassCoordinates ? <Marker coordinate={carcassCoordinates} zIndex={2} /> : null}
          </Map>
          {reportState.showReport ? (
            <View
              pointerEvents="none"
              style={[styles.crosshairContainer, { top: crosshairCoordinates.y, left: crosshairCoordinates.x }]}
            >
              <CrosshairIcon />
            </View>
          ) : null}
        </>
      ) : null}
      <View style={styles.controlContainer}>
        <View>
          <MapButton
            iconPack="material-community"
            iconName="folder-account"
            onPress={navigation.openDrawer}
            showAlert={hasUnsubmittedReports}
          />
        </View>
        <View>
          {authInfo.user.role === config.USER_TYPES.public ? null : (
            <MapButton
              iconPack="material-community"
              iconName="truck-fast"
              onPress={onRouteButtonPress}
              status={vehicleTrackingState.buttonStatus}
            >
              Track
            </MapButton>
          )}
        </View>
        <View>
          <MapButton
            iconPack="material-community"
            iconName={isFollowing ? 'crosshairs-gps' : 'crosshairs'}
            onPress={() => followUser()}
          />
        </View>
      </View>
      <View style={styles.controlContainer}>
        <View></View>
        <View style={styles.bottomContainer}>
          <MapButton iconPack="material" iconName="add-circle" onPress={showAddReport}>
            Report
          </MapButton>
        </View>
        <View></View>
      </View>
      <Report
        show={reportState.showReport}
        reportType={reportState.reportType}
        hideReport={hideAddReport}
        setHeight={setReportHeight}
        setMarker={setMarker}
        carcassCoordinates={carcassCoordinates}
        vehicleTrackingDispatch={vehicleTrackingDispatch}
        vehicleTrackingState={vehicleTrackingState}
      />
      <VehicleTracking
        state={vehicleTrackingState}
        dispatch={vehicleTrackingDispatch}
        startTracking={startTracking}
        resumeRoute={resumeRoute}
        startRoute={startRoute}
      />
    </RootView>
  );
}

MainScreen.propTypes = {
  navigation: propTypes.object,
};

const MAP_PADDING = 20;
const CROSSHAIR_SIZE = 40;
const styles = StyleSheet.create({
  root: {
    justifyContent: 'space-between',
  },
  map: {
    position: 'absolute',
    top: 0,
  },
  controlContainer: {
    paddingHorizontal: MAP_PADDING,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bottomContainer: {
    paddingBottom: MAP_PADDING,
  },
  crosshairContainer: {
    position: 'absolute',
    marginLeft: -CROSSHAIR_SIZE / 2,
    marginTop: -CROSSHAIR_SIZE / 2,
  },
});
