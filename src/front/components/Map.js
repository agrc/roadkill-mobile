import propTypes from 'prop-types';
import { Platform } from 'react-native';
import MapView, { MAP_TYPES, UrlTile } from 'react-native-maps';
import config from '../services/config';
import { tileCacheDirectory, useOfflineCache } from '../services/offline';

export default function Map({ innerRef, children, isStatic, ...mapViewProps }) {
  const { isConnected } = useOfflineCache();
  if (isStatic) {
    mapViewProps = {
      ...mapViewProps,
      zoomEnabled: false,
      zoomTapEnabled: false,
      zoomControlEnabled: false,
      scrollEnabled: false,
    };
  }
  return (
    <MapView
      loadingEnabled={true}
      mapType={Platform.select({ android: 'none', ios: MAP_TYPES.STANDARD })}
      maxAltitude={config.MAX_ALTITUDE}
      maxZoomLevel={config.MAX_ZOOM_LEVEL}
      minZoomLevel={5}
      pitchEnabled={false}
      ref={innerRef}
      rotateEnabled={false}
      showsBuildings={false}
      showsCompass={false}
      showsMyLocationButton={false}
      showsPointsOfInterest={false}
      showsScale={false}
      toolbarEnabled={false}
      {...mapViewProps}
    >
      <UrlTile
        doubleTileSize={true}
        minimumZ={3}
        offlineMode={!isConnected}
        shouldReplaceMapContent={true}
        tileCacheMaxAge={60 * 60 * 24 * 7}
        tileCachePath={tileCacheDirectory}
        tileSize={384}
        urlTemplate={config.URLS.HYBRID}
        zIndex={-5}
      />
      {children}
    </MapView>
  );
}
Map.propTypes = {
  innerRef: propTypes.object,
  children: propTypes.node,
  isStatic: propTypes.bool,
};
