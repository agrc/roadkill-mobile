import { FontAwesome, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button, useTheme } from '@ui-kitten/components';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import propTypes from 'prop-types';
import React from 'react';
import { Alert, AppState, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';
import useAuth from '../auth/context';
import config from '../config';
import RootView from '../RootView';
import { wrapAsyncWithDelay } from '../utilities';

const MapButton = ({ IconComponent, iconName, onPress, style, showAlert }) => {
  const theme = useTheme();
  const iconSize = 30;
  const alertSize = 12;
  const ButtonIcon = () => (
    <View style={{ height: iconSize, width: iconSize, justifyContent: 'center', alignItems: 'center' }}>
      <IconComponent name={iconName} color="white" size={iconSize} />
      {showAlert ? (
        <FontAwesome name="circle" size={alertSize} style={styles.alertIcon} color={theme['color-warning-500']} />
      ) : null}
    </View>
  );

  return <Button accessoryLeft={ButtonIcon} style={style} size="tiny" onPress={onPress} />;
};
MapButton.propTypes = {
  IconComponent: propTypes.func.isRequired,
  iconName: propTypes.string.isRequired,
  onPress: propTypes.func.isRequired,
  style: propTypes.object,
  showAlert: propTypes.bool,
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
  const [hasUnsubmittedReports, setHasUnsubmittedReports] = React.useState(false);

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

    mapView.current.animateCamera({
      center: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
    });
  };
  const showAddReport = () => {
    console.log('showAddReport');
    setHasUnsubmittedReports(!hasUnsubmittedReports);
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
          style={[styles.map, mapSizeStyle]}
        >
          <UrlTile urlTemplate={config.URLS.LITE} shouldReplaceMapContent={true} minimumZ={3} zIndex={-1} />
        </MapView>
      ) : null}
      <View style={styles.controlContainer}>
        <View>
          <MapButton
            IconComponent={MaterialCommunityIcons}
            iconName="menu"
            onPress={navigation.openDrawer}
            showAlert={hasUnsubmittedReports}
          />
        </View>
        <View>
          <MapButton IconComponent={MaterialIcons} iconName="my-location" onPress={zoomToCurrentLocation} />
        </View>
      </View>
      <View style={styles.controlContainer}>
        <View></View>
        <View style={styles.bottomContainer}>
          {authInfo.user.role === config.USER_TYPES.public ? null : (
            <MapButton
              IconComponent={MaterialIcons}
              iconName="drive-eta"
              onPress={showAddRoute}
              style={styles.topButton}
            />
          )}
          <MapButton IconComponent={MaterialIcons} iconName="add-circle" onPress={showAddReport} />
        </View>
      </View>
    </RootView>
  );
}

MainScreen.propTypes = {
  navigation: propTypes.object,
};

const MAP_PADDING = 20;
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
    paddingBottom: Platform.select({ android: MAP_PADDING }),
  },
  topButton: {
    marginBottom: MAP_PADDING / 2,
  },
  alertIcon: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
});
