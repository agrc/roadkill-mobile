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

const MapButton = ({ iconName, onPress }) => {
  const iconSize = 30;
  const ButtonIcon = (props) => <Icon {...props} name={iconName} height={iconSize} width={iconSize} />;

  return <Button accessoryLeft={ButtonIcon} style={styles.menuButton} size="tiny" onPress={onPress} />;
};
MapButton.propTypes = {
  iconName: propTypes.string.isRequired,
  onPress: propTypes.func.isRequired,
};

export default function MainScreen() {
  const navigation = useNavigation();
  const [userLocation, setUserLocation] = React.useState(null);
  const appState = React.useRef(AppState.currentState);

  React.useEffect(() => {
    const getLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Location permission are required to submit reports.', [
          { text: 'OK', onPress: () => Linking.openSettings() },
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
      <View style={styles.topContainer}>
        <View style={styles.leftContainer}>
          <MapButton iconName="menu" onPress={navigation.openDrawer} />
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
