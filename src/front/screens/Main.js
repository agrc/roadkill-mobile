import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@ui-kitten/components';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import propTypes from 'prop-types';
import React from 'react';
import { Alert, AppState, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';
import useAuth from '../auth/context';
import MapButton from '../components/MapButton';
import config from '../config';
import { getIcon } from '../icons';
import { followUser, getLocation, locationToRegion } from '../location';
import RootView from '../RootView';
import { wrapAsyncWithDelay } from '../utilities';
import Report, { REPORT_TYPES } from './Report';

export default function MainScreen() {
  const navigation = useNavigation();
  const [initialLocation, setInitialLocation] = React.useState(null);
  const appState = React.useRef(AppState.currentState);
  const [showSpinner, setShowSpinner] = React.useState(false);
  const mapView = React.useRef(null);
  const { authInfo } = useAuth();
  // eslint-disable-next-line no-unused-vars
  const [hasUnsubmittedReports, setHasUnsubmittedReports] = React.useState(false);
  const [reportType, setReportType] = React.useState(null);
  const [showCrosshair, setShowCrosshair] = React.useState(false);
  const theme = useTheme();
  const mapDimensions = React.useRef(null);
  const [reportHeight, setReportHeight] = React.useState(0);
  const [carcassCoordinates, setCarcassCoordinates] = React.useState(null);
  const [followSubscription, setFollowSubscription] = React.useState(null);

  React.useEffect(() => {
    const initLocation = async () => {
      const result = await Location.requestForegroundPermissionsAsync();
      if (result.status !== 'granted') {
        Alert.alert('Error', 'Location permission are required to submit reports.', [
          { text: 'OK', onPress: () => Linking.openSettings() },
        ]);

        return;
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

    AppState.addEventListener('change', handleAppStateChange);

    wrapAsyncWithDelay(
      initLocation,
      () => setShowSpinner(true),
      () => setShowSpinner(false),
      config.SPINNER_DELAY
    );

    return () => AppState.removeEventListener('change', handleAppStateChange);
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

  const followIfNotFollowing = async (zoom) => {
    if (!followSubscription) {
      setFollowSubscription(await followUser(mapView.current, zoom));
    } else if (zoom) {
      mapView.current.animateCamera({
        zoom: zoom,
      });
    }
  };

  const showAddReport = () => {
    const displayReport = (newReportType) => {
      setReportType(newReportType);
      const zoom = async () => {
        await followIfNotFollowing(config.MAX_ZOOM_LEVEL);
        setShowCrosshair(true);
      };

      if (Platform.OS === 'android') {
        // give map padding time to catch up
        setTimeout(zoom, 300);
      } else {
        zoom();
      }
    };

    if (authInfo.user.role === config.USER_TYPES.public) {
      displayReport(REPORT_TYPES.report);
    } else if (authInfo.user.role === config.USER_TYPES.agency || authInfo.user.role === config.USER_TYPES.admin) {
      Alert.alert(null, 'I would like to...', [
        {
          text: 'Pick up a carcass',
          onPress: () => displayReport(REPORT_TYPES.pickup),
        },
        {
          text: 'Report a carcass',
          onPress: () => displayReport(REPORT_TYPES.report),
        },
      ]);
    } else {
      displayReport(REPORT_TYPES.pickup);
    }
  };

  const onRegionChange = (_, event) => {
    if (followSubscription && event.isGesture) {
      followSubscription.remove();

      setFollowSubscription(null);
    }
  };

  const hideAddReport = () => {
    setReportType(null);
    setShowCrosshair(false);
    setCarcassCoordinates(null);
  };

  const showAddRoute = () => {
    console.log('showAddRoute');
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
          <MapView
            initialRegion={locationToRegion(initialLocation)}
            loadingEnabled={true}
            onRegionChange={onRegionChange}
            mapPadding={
              reportType
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
            mapType="none"
            maxZoomLevel={18}
            minZoomLevel={5}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              mapDimensions.current = { width, height };
            }}
            pitchEnabled={false}
            provider={PROVIDER_GOOGLE}
            ref={mapView}
            rotateEnabled={false}
            showsMyLocationButton={false}
            showsUserLocation={true}
            style={[styles.map, mapSizeStyle]}
          >
            {carcassCoordinates ? <Marker coordinate={carcassCoordinates} /> : null}
            <UrlTile urlTemplate={config.URLS.LITE} shouldReplaceMapContent={true} minimumZ={3} zIndex={-1} />
          </MapView>
          {showCrosshair && reportHeight > 0 ? (
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
            iconName="menu"
            onPress={navigation.openDrawer}
            showAlert={hasUnsubmittedReports}
          />
        </View>
        <View>
          <MapButton
            iconPack="material"
            iconName={followSubscription ? 'my-location' : 'location-searching'}
            onPress={() => followIfNotFollowing()}
          />
        </View>
      </View>
      <View style={styles.controlContainer}>
        <View></View>
        <View style={styles.bottomContainer}>
          {authInfo.user.role === config.USER_TYPES.public ? null : (
            <MapButton iconPack="material" iconName="drive-eta" onPress={showAddRoute} style={styles.topButton} />
          )}
          <MapButton iconPack="material" iconName="add-circle" onPress={showAddReport} />
        </View>
      </View>
      <Report
        reportType={reportType}
        hideReport={hideAddReport}
        setHeight={setReportHeight}
        setMarker={setMarker}
        carcassCoordinates={carcassCoordinates}
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
  topButton: {
    marginBottom: MAP_PADDING / 2,
  },
  crosshairContainer: {
    position: 'absolute',
    marginLeft: -CROSSHAIR_SIZE / 2,
    marginTop: -CROSSHAIR_SIZE / 2,
  },
});
