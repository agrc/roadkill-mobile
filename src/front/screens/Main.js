import { useNavigation } from '@react-navigation/native';
import { Button, Icon } from '@ui-kitten/components';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import propTypes from 'prop-types';
import React from 'react';
import { Alert, AppState, Dimensions, Platform, StyleSheet, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';
import config from '../config';
import RootView from '../RootView';
import { wrapAsyncWithDelay } from '../utilities';

const MapButton = ({ iconName, onPress }) => {
  const iconSize = 30;
  const ButtonIcon = (props) => <Icon {...props} name={iconName} height={iconSize} width={iconSize} />;

  return <Button accessoryLeft={ButtonIcon} style={styles.menuButton} size="tiny" onPress={onPress} />;
};
MapButton.propTypes = {
  iconName: propTypes.string.isRequired,
  onPress: propTypes.func.isRequired,
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

  React.useEffect(() => {
    const getLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Location permission are required to submit reports.', [
          { text: 'OK', onPress: () => Linking.openSettings() },
        ]);

        return;
      }

      const location = await Location.getCurrentPositionAsync({
        enableHighAccuracy: false,
      });

      setInitialLocation(location);
    };

    const handleAppStateChange = async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active' && !initialLocation) {
        await wrapAsyncWithDelay(
          getLocation,
          () => setShowSpinner(true),
          () => setShowSpinner(false),
          config.SPINNER_DELAY
        );
      }

      appState.current = nextAppState;
    };

    AppState.addEventListener('change', handleAppStateChange);

    wrapAsyncWithDelay(
      getLocation,
      () => setShowSpinner(true),
      () => setShowSpinner(false),
      config.SPINNER_DELAY
    );

    return () => AppState.removeEventListener('change', handleAppStateChange);
  }, []);

  const zoomToCurrentLocation = async () => {
    const location = await Location.getCurrentPositionAsync();

    mapView.current.animateToRegion(locationToRegion(location));
  };

  return (
    <RootView showSpinner={showSpinner} spinnerMessage="getting current location">
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
      <View style={styles.topContainer}>
        <View style={styles.leftContainer}>
          <MapButton iconName="menu" onPress={navigation.openDrawer} />
        </View>
        <View>
          <MapButton iconName="radio-button-on" onPress={zoomToCurrentLocation} />
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
  topContainer: {
    paddingHorizontal: MAP_PADDING,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  menuButton: {
    padding: 2,
  },
});
