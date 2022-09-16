import propTypes from 'prop-types';
import { Platform } from 'react-native';
import MapView, { MAP_TYPES, UrlTile } from 'react-native-maps';
import config from '../services/config';
import { tileCacheDirectory } from '../services/offline';

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
  return (
    <MapView
      loadingEnabled={true}
      mapType={Platform.select({ android: 'none', ios: MAP_TYPES.STANDARD })}
      maxZoomLevel={config.MAX_ZOOM_LEVEL}
      maxAltitude={config.MAX_ALTITUDE}
      minZoomLevel={5}
      pitchEnabled={false}
      ref={innerRef}
      rotateEnabled={false}
      showsMyLocationButton={false}
      toolbarEnabled={false}
      {...mapViewProps}
    >
      <UrlTile
        doubleTileSize={true}
        minimumZ={3}
        shouldReplaceMapContent={true}
        tileCachePath={tileCacheDirectory}
        tileCacheMaxAge={60 * 60 * 24 * 7}
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
