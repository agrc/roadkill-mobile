import { Marker } from 'react-native-maps';

// react-native-maps always sets the iOS MKMarkerAnnotationView centerOffset
// (defaulting to 0, 0), which centers the balloon on the coordinate instead of
// its bottom tip. Shift it up by roughly half of the balloon's height so that
// the tip points at the actual location. Android uses `anchor`, which already
// defaults to the bottom center.
const CENTER_OFFSET = { x: 0, y: -20 };

export default function PinMarker(props) {
  return <Marker centerOffset={CENTER_OFFSET} {...props} />;
}
