import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import propTypes from 'prop-types';
import React from 'react';
import { Alert, AppState, Dimensions, Platform, StyleSheet } from 'react-native';
import MapView, { PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';
import useAuth from '../auth/context';
import config from '../config';
import RootView from '../RootView';

const goToSettings = () => {
  if (Constants.platform.ios) {
    Linking.openURL('app-settings:');
  } else {
    const packageName = __DEV__ ? 'host.exp.exponent' : Constants.manifest.android.package;
    IntentLauncher.startActivityAsync(IntentLauncher.ACTION_APPLICATION_DETAILS_SETTINGS, {
      data: 'package:' + packageName,
    });
  }
};

export default function MainScreen() {
  const { logOut } = useAuth();
  const [userLocation, setUserLocation] = React.useState(null);
  const appState = React.useRef(AppState.currentState);

  React.useEffect(() => {
    const getLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Location permission are required to submit reports.', [
          { text: 'OK', onPress: goToSettings },
        ]);

        return;
      }

      let location = await Location.getCurrentPositionAsync({
        enableHighAccuracy: false,
      });
      setUserLocation(location);
    };

    const handleAppStateChange = async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active' && !userLocation) {
        await getLocation();
      }

      appState.current = nextAppState;
    };

    AppState.addEventListener('change', handleAppStateChange);

    getLocation();

    return () => AppState.removeEventListener('change', handleAppStateChange);
  }, []);

  return (
    <RootView>
      {userLocation ? (
        <MapView
          style={[styles.map]}
          showsUserLocation={true}
          showsMyLocationButton={false}
          rotateEnabled={false}
          pitchEnabled={false}
          provider={PROVIDER_GOOGLE}
          mapType="none"
          edgePadding={{
            top: 20,
            right: 0,
            bottom: 20,
            left: 0,
          }}
          initialRegion={{
            latitude: userLocation.coords.latitude,
            longitude: userLocation.coords.longitude,
            latitudeDelta: 0.1,
            longitudeDelta: 0.05,
          }}
          maxZoomLevel={18}
          minZoomLevel={5}
        >
          <UrlTile urlTemplate={config.URLS.LITE} shouldReplaceMapContent={true} minimumZ={3} zIndex={-1} />
        </MapView>
      ) : null}
    </RootView>
  );
}

MainScreen.propTypes = {
  navigation: propTypes.object,
};

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;
const ZOOM_FACTOR = 1.3;

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
});
