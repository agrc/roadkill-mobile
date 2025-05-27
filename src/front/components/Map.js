import { SQLiteProvider } from 'expo-sqlite';
import propTypes from 'prop-types';
import { useRef, useState } from 'react';
import MapView from 'react-native-maps';
import MileMarkers from './MileMarkers';

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

  const [camera, setCamera] = useState(null);
  const [region, setRegion] = useState(null);
  const mapViewRef = useRef(null);
  const onRegionChange = async (region) => {
    const newCamera = await (innerRef || mapViewRef).current.getCamera();
    setCamera(newCamera);
    setRegion(region);
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
      <SQLiteProvider
        databaseName="mileMarkers.db"
        assetSource={{ assetId: require('../data/mileMarkers.db') }}
      >
        <MileMarkers camera={camera} region={region} />
      </SQLiteProvider>
      {children}
    </MapView>
  );
}
Map.propTypes = {
  innerRef: propTypes.object,
  children: propTypes.node,
  isStatic: propTypes.bool,
};
