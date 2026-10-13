import { SQLiteProvider } from 'expo-sqlite';
import propTypes from 'prop-types';
import { useRef, useState } from 'react';
import MapView from 'react-native-maps';
import MileMarkers, { MapViewStateContext } from './MileMarkers';

// every Map renders its own provider for the same database, and a provider
// closes its database when it unmounts. Without a separate connection, closing
// a static map (e.g. report info) closed the main map's shared connection too.
const SQLITE_OPTIONS = { useNewConnection: true };

export default function Map({ innerRef, children, isStatic, ...mapViewProps }) {
  if (isStatic) {
    mapViewProps = {
      ...mapViewProps,
      zoomEnabled: false,
      zoomTapEnabled: false,
      zoomControlEnabled: false,
      scrollEnabled: false,
    };
  }

  const [mapViewState, setMapViewState] = useState({
    camera: null,
    region: null,
  });
  const mapViewRef = useRef(null);
  const onRegionChange = async (region) => {
    const camera = await (innerRef || mapViewRef).current.getCamera();
    setMapViewState({ camera, region });
  };

  return (
    <MapView
      loadingEnabled={true}
      mapType="hybrid"
      minZoomLevel={5}
      pitchEnabled={false}
      ref={innerRef || mapViewRef}
      rotateEnabled={false}
      showsBuildings={false}
      showsCompass={false}
      showsMyLocationButton={false}
      showsPointsOfInterest={false}
      showsScale={false}
      toolbarEnabled={false}
      onRegionChangeComplete={!isStatic ? onRegionChange : null}
      {...mapViewProps}
    >
      <MapViewStateContext.Provider value={mapViewState}>
        <SQLiteProvider
          databaseName="mileMarkers.db"
          options={SQLITE_OPTIONS}
          assetSource={{ assetId: require('../data/mileMarkers.db') }}
        >
          <MileMarkers />
        </SQLiteProvider>
      </MapViewStateContext.Provider>
      {children}
    </MapView>
  );
}
Map.propTypes = {
  innerRef: propTypes.object,
  children: propTypes.node,
  isStatic: propTypes.bool,
};
