import propTypes from 'prop-types';
import MapView from 'react-native-maps';

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
      mapType="hybrid"
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
      {children}
    </MapView>
  );
}
Map.propTypes = {
  innerRef: propTypes.object,
  children: propTypes.node,
  isStatic: propTypes.bool,
};
