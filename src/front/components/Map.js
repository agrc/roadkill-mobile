import propTypes from 'prop-types';
import React from 'react';
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
      maxZoomLevel={18}
      minZoomLevel={5}
      pitchEnabled={false}
      ref={innerRef}
      rotateEnabled={false}
      showsMyLocationButton={false}
      toolbarEnabled={false}
      {...mapViewProps}
    >
      {children}
      <UrlTile
        doubleTileSize={Platform.select({ android: true, ios: false })}
        minimumZ={3}
        shouldReplaceMapContent={true}
        tileCachePath={tileCacheDirectory}
        tileCacheMaxAge={60 * 60 * 24 * 7}
        // ios doubles the tile sizes despite setting doubleTileSize to false
        // this setting is to help resize them so that the labels aren't tiny
        tileSize={Platform.select({ android: 256, ios: 384 })}
        urlTemplate={config.URLS.LITE}
        zIndex={-5}
      />
    </MapView>
  );
}
Map.propTypes = {
  innerRef: propTypes.object,
  children: propTypes.node,
  isStatic: propTypes.bool,
};
