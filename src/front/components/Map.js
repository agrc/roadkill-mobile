import propTypes from 'prop-types';
import React from 'react';
import MapView, { PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';
import config from '../config';

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
      mapType="none"
      maxZoomLevel={18}
      minZoomLevel={5}
      pitchEnabled={false}
      provider={PROVIDER_GOOGLE}
      ref={innerRef}
      rotateEnabled={false}
      showsMyLocationButton={false}
      toolbarEnabled={false}
      {...mapViewProps}
    >
      {children}
      <UrlTile urlTemplate={config.URLS.LITE} shouldReplaceMapContent={true} minimumZ={3} zIndex={-1} />
    </MapView>
  );
}
Map.propTypes = {
  innerRef: propTypes.object,
  children: propTypes.node,
  isStatic: propTypes.bool,
};
