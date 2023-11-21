import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@ui-kitten/components';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { pick } from 'lodash';
import propTypes from 'prop-types';
import React from 'react';
import { Alert, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Marker, Polyline } from 'react-native-maps';
import { useImmerReducer } from 'use-immer';
import useAuth from '../auth/context';
import FocusAwareStatusBar from '../components/FocusAwareStatusBar';
import Map from '../components/Map';
import MapButton from '../components/MapButton';
import RootView from '../components/RootView';
import VehicleTracking, {
  initialVehicleTrackingState,
  vehicleTrackingReducer,
} from '../components/VehicleTracking';
import backgroundLocationService, {
  verifyPermissions,
} from '../services/backgroundLocation';
import config from '../services/config';
import { getIcon } from '../services/icons';
import t from '../services/localization';
import {
  getLocation,
  locationToRegion,
  useFollowUser,
} from '../services/location';
import { useOfflineCache } from '../services/offline';
import {
  pointStringToCoordinates,
  wrapAsyncWithDelay,
} from '../services/utilities';
import Report from './Report';

const initialReportState = {
  reportType: config.REPORT_TYPES.report,
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
  const [showSpinner, setShowSpinner] = React.useState(false);
  const mapView = React.useRef(null);
  const { authInfo } = useAuth();
  // eslint-disable-next-line no-unused-vars
  const { cachedSubmissionIds } = useOfflineCache();
  const theme = useTheme();
  const [carcassCoordinates, setCarcassCoordinates] = React.useState(null);
  const [reportState, dispatchReportState] = useImmerReducer(
    reportReducer,
    initialReportState,
  );
  const { followUser, stopFollowUser, isFollowing } = useFollowUser(mapView);
  const [vehicleTrackingState, vehicleTrackingDispatch] = useImmerReducer(
    vehicleTrackingReducer,
    initialVehicleTrackingState,
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
        vehicleTrackingDispatch({ type: 'SHOW' });
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

    await Location.startLocationUpdatesAsync(
      backgroundLocationService.taskName,
      {
        accuracy: Location.Accuracy.BestForNavigation,
        activityType: Location.ActivityType.AutomotiveNavigation,
        deferredUpdatesInterval: 2500, // milliseconds
        foregroundService: {
          notificationTitle: t('screens.main.trackingNotificationTitle'),
          notificationBody: t('screens.main.trackingNotificationBody'),
        },
        showsBackgroundLocationIndicator: true,
      },
    );
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
    console.log('initLocation');

    const result = await Location.requestForegroundPermissionsAsync();
    if (!result.granted) {
      Alert.alert(t('error'), t('screens.main.locationPermissionsRequired'), [
        { text: t('ok'), onPress: () => Linking.openSettings() },
      ]);

      return;
    }

    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      Alert.alert(t('error'), t('screens.main.locationServicesRequired'), [
        { text: t('ok'), onPress: () => Linking.openSettings() },
      ]);

      return;
    }

    const location = await getLocation();

    setInitialLocation(location);
  };

  React.useEffect(() => {
    wrapAsyncWithDelay(
      initLocation,
      () => setShowSpinner(true),
      () => setShowSpinner(false),
      config.SPINNER_DELAY,
    );
  }, []);

  const setMarker = async () => {
    const points = { ...crosshairPoints };

    const coordinates = await mapView.current.coordinateForPoint(points);

    setCarcassCoordinates(coordinates);
  };

  const showAddReport = () => {
    const displayReport = async (newReportType) => {
      await followUser(true);

      dispatchReportState({
        type: 'show',
        meta: newReportType,
      });
    };

    if (authInfo.user.role === config.USER_TYPES.public) {
      displayReport(config.REPORT_TYPES.report);
    } else if (
      authInfo.user.role === config.USER_TYPES.agency ||
      authInfo.user.role === config.USER_TYPES.admin
    ) {
      Alert.alert(t('screens.main.iWouldLike'), null, [
        {
          text: t('screens.main.pickup'),
          onPress: () => displayReport(config.REPORT_TYPES.pickup),
        },
        {
          text: t('screens.main.report'),
          onPress: () => displayReport(config.REPORT_TYPES.report),
        },
        {
          text: t('cancel'),
          style: 'cancel',
        },
      ]);
    } else {
      // contractor
      if (!vehicleTrackingState.isTracking) {
        Alert.alert(
          t('screens.main.noRouteStarted'),
          t('screens.main.startRouteQuestion'),
          [
            {
              text: t('cancel'),
              style: 'cancel',
            },
            {
              text: t('screens.main.startRoute'),
              onPress: () => {
                startRoute();

                displayReport(config.REPORT_TYPES.pickup);
              },
            },
          ],
        );

        return;
      }

      if (vehicleTrackingState.isTracking && vehicleTrackingState.isPaused) {
        Alert.alert(
          t('screens.main.routePaused'),
          t('screens.main.resumeRouteQuestion'),
          [
            {
              text: t('cancel'),
              style: 'cancel',
            },
            {
              text: t('screens.main.resumeRoute'),
              onPress: () => {
                resumeRoute();

                displayReport(config.REPORT_TYPES.pickup);
              },
            },
          ],
        );

        return;
      }

      displayReport(config.REPORT_TYPES.pickup);
    }
  };

  const onPanDrag = () => {
    if (isFollowing) {
      stopFollowUser();
    }
  };

  const hideAddReport = React.useCallback(() => {
    dispatchReportState({
      type: 'hide',
    });
    setCarcassCoordinates(null);
  }, [dispatchReportState]);

  const { height, width } = useWindowDimensions();
  const mapSizeStyle = {
    height,
    width,
  };

  const CrosshairIcon = getIcon({
    pack: 'font-awesome-5',
    name: 'crosshairs',
    size: CROSSHAIR_SIZE,
    color: theme['color-basic-900'],
  });

  const [crosshairPoints, setCrosshairPoints] = React.useState(null);
  React.useEffect(() => {
    const giddyUp = async () => {
      const camera = await mapView.current.getCamera();
      const newPoints = await mapView.current.pointForCoordinate(camera.center);
      setCrosshairPoints(newPoints);
    };

    if (reportState.showReport) {
      giddyUp();
    } else {
      setCrosshairPoints(null);
    }
  }, [reportState.showReport]);

  const VehicleIcon = getIcon({
    pack: 'material',
    name: 'drive-eta',
    size: 36,
    color: theme['color-basic-900'],
  });
  const showTrackingMarker =
    vehicleTrackingState.isTracking &&
    !vehicleTrackingState.isPaused &&
    vehicleTrackingState.routeCoordinates.length;

  return (
    <RootView
      showSpinner={showSpinner}
      spinnerMessage={t('loading.gettingCurrentLocation')}
      style={styles.root}
    >
      <FocusAwareStatusBar style={'light'} />
      {initialLocation ? (
        <>
          <Map
            initialRegion={locationToRegion(initialLocation)}
            onPanDrag={onPanDrag}
            innerRef={mapView}
            style={[styles.map, mapSizeStyle]}
            showsUserLocation={!showTrackingMarker}
          >
            {vehicleTrackingState.routeCoordinates?.length ? (
              <Polyline
                coordinates={vehicleTrackingState.routeCoordinates}
                strokeColor={
                  theme[`color-${vehicleTrackingState.buttonStatus}-500`]
                }
                strokeWidth={8}
                zIndex={1}
              />
            ) : null}
            {vehicleTrackingState.pickups?.length > 0
              ? vehicleTrackingState.pickups.map((pickup) => (
                  <Marker
                    coordinate={pointStringToCoordinates(
                      pickup.animal_location,
                    )}
                    key={pickup.submit_date}
                    zIndex={2}
                    pinColor="navy"
                    tappable={false}
                  />
                ))
              : null}
            {showTrackingMarker ? (
              <Marker
                coordinate={
                  vehicleTrackingState.routeCoordinates[
                    vehicleTrackingState.routeCoordinates.length - 1
                  ]
                }
                key="current-location"
                zIndex={10}
                tappable={false}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                {
                  <View
                    style={{
                      backgroundColor: theme['color-basic-200'],
                      borderRadius: 18,
                      padding: 2,
                      borderWidth: 1,
                      borderColor: theme['color-basic-900'],
                    }}
                  >
                    <VehicleIcon />
                  </View>
                }
              </Marker>
            ) : null}
            {carcassCoordinates ? (
              <Marker
                coordinate={carcassCoordinates}
                zIndex={2}
                tappable={false}
              />
            ) : null}
          </Map>
          {crosshairPoints ? (
            <View
              pointerEvents="none"
              style={[
                styles.crosshairContainer,
                { top: crosshairPoints.y, left: crosshairPoints.x },
              ]}
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
            alertNumber={cachedSubmissionIds.length || null}
          />
        </View>
        <View>
          {authInfo.user.role === config.USER_TYPES.public ? null : (
            <MapButton
              iconPack="material-community"
              iconName="truck-fast"
              onPress={onRouteButtonPress}
              status={vehicleTrackingState.buttonStatus}
              color={theme['color-basic-800']}
            >
              {t('track')}
            </MapButton>
          )}
        </View>
        <View>
          <MapButton
            iconPack="material-community"
            iconName={isFollowing ? 'crosshairs-gps' : 'crosshairs'}
            onPress={followUser}
          />
        </View>
      </View>
      <View style={styles.controlContainer}>
        <View></View>
        <View style={styles.bottomContainer}>
          <MapButton
            iconPack="material"
            iconName="add-circle"
            onPress={showAddReport}
            status="primary"
            color={theme['color-basic-800']}
          >
            {t('report')}
          </MapButton>
        </View>
        <View></View>
      </View>
      <Report
        show={reportState.showReport}
        reportType={reportState.reportType}
        hideReport={hideAddReport}
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
