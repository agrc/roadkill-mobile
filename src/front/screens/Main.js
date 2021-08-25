import { useNavigation } from '@react-navigation/native';
import { Button, Icon } from '@ui-kitten/components';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import propTypes from 'prop-types';
import React from 'react';
import { Alert, AppState, Dimensions, Platform, StyleSheet, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';
import useAuth from '../auth/context';
import config from '../config';
import RootView from '../RootView';
import { wrapAsyncWithDelay } from '../utilities';

const MapButton = ({ iconName, onPress, style }) => {
  const iconSize = 30;
  const ButtonIcon = (props) => <Icon {...props} name={iconName} height={iconSize} width={iconSize} />;

  return <Button accessoryLeft={ButtonIcon} style={[styles.mapButton, style]} size="tiny" onPress={onPress} />;
};
MapButton.propTypes = {
  iconName: propTypes.string.isRequired,
  onPress: propTypes.func.isRequired,
  style: propTypes.object,
};

const locationToRegion = function (location) {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: 0.1,
    longitudeDelta: 0.05,
  };
};

export default function MainScreen() {
  const navigation = useNavigation();
  const [initialLocation, setInitialLocation] = React.useState(null);
  const appState = React.useRef(AppState.currentState);
  const [showSpinner, setShowSpinner] = React.useState(false);
  const mapView = React.useRef(null);
  const { authInfo } = useAuth();

  const getLocation = async () => {
    let location;
    try {
      location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
    } catch (error) {
      console.log(`getCurrentPositionAsync: ${error}`);

      location = await Location.getLastKnownPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
    }

    return location;
  };

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

  const zoomToCurrentLocation = async () => {
    const location = await getLocation();

    mapView.current.animateToRegion(locationToRegion(location));
  };
  const showAddReport = () => {
    console.log('showAddReport');
  };
  const showAddRoute = () => {
    console.log('showAddRoute');
  };

  return (
    <RootView showSpinner={showSpinner} spinnerMessage="getting current location" style={styles.root}>
      {initialLocation ? (
        <MapView
          edgePadding={{
            bottom: 20,
            left: 0,
            right: 0,
            top: 20,
          }}
          initialRegion={locationToRegion(initialLocation)}
          mapType="none"
          maxZoomLevel={18}
          minZoomLevel={5}
          pitchEnabled={false}
          provider={PROVIDER_GOOGLE}
          ref={mapView}
          rotateEnabled={false}
          showsMyLocationButton={false}
          showsUserLocation={true}
          style={[styles.map]}
        >
          <UrlTile urlTemplate={config.URLS.LITE} shouldReplaceMapContent={true} minimumZ={3} zIndex={-1} />
        </MapView>
      ) : null}
      <View style={styles.controlContainer}>
        <View>
          <MapButton iconName="menu" onPress={navigation.openDrawer} />
        </View>
        <View>
          <MapButton iconName="radio-button-on" onPress={zoomToCurrentLocation} />
        </View>
      </View>
      <View style={styles.controlContainer}>
        <View></View>
        <View>
          {authInfo.user.role === config.USER_TYPES.public ? null : (
            <MapButton iconName="car" onPress={showAddRoute} style={styles.topButton} />
          )}
          <MapButton iconName="plus-circle" onPress={showAddReport} />
        </View>
      </View>
    </RootView>
  );
}

MainScreen.propTypes = {
  navigation: propTypes.object,
};

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;
const ZOOM_FACTOR = 1.3;
const MAP_PADDING = 20;

const styles = StyleSheet.create({
  root: {
    justifyContent: 'space-between',
  },
  map: {
    position: 'absolute',
    top: 0,
    ...Platform.select({
      ios: {
        height: SCREEN_HEIGHT,
        width: SCREEN_WIDTH,
      },
      android: {
        // the cache tiles look super-pixelated on android, this is a hack to help them look better
        height: SCREEN_HEIGHT * ZOOM_FACTOR,
        width: SCREEN_WIDTH * ZOOM_FACTOR,
        marginTop: -(SCREEN_HEIGHT * ZOOM_FACTOR - SCREEN_HEIGHT) / 2,
        marginLeft: -(SCREEN_WIDTH * ZOOM_FACTOR - SCREEN_WIDTH) / 2,
        transform: [{ scale: 1 / ZOOM_FACTOR }],
      },
    }),
  },
  controlContainer: {
    paddingHorizontal: MAP_PADDING,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mapButton: {
    padding: 2,
  },
  topButton: {
    marginBottom: MAP_PADDING / 2,
  },
});
