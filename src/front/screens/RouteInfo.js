import { useNavigation, useRoute } from '@react-navigation/native';
import { Card, Divider, Layout, Text, useTheme } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { PixelRatio, Platform, SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { Marker, Polyline } from 'react-native-maps';
import { useQuery } from 'react-query';
import Map from '../components/Map';
import Spinner from '../components/Spinner';
import ValueContainer from '../components/ValueContainer';
import { useAPI } from '../services/api';
import { coordsToLocation } from '../services/location';
import { PADDING } from '../services/styles';
import { dateToString, extentStringToRegion, lineStringToCoordinates } from '../services/utilities';
import { ReportListItem } from './MyReports';

export default function RouteInfoScreen() {
  const { routeId } = useRoute().params;
  const navigation = useNavigation();
  const { get } = useAPI();

  const getRouteData = async () => {
    const responseJson = await get(`routes/route/${routeId}`);

    return responseJson.route;
  };
  const { data, isLoading, isError, error } = useQuery(`route-${routeId}`, getRouteData);

  React.useEffect(() => {
    if (data) {
      navigation.setOptions({
        title: `Route Info`,
      });
    }
  }, [data]);

  return (
    <Layout style={styles.container}>
      <ScrollView style={styles.container}>
        {isError ? (
          <Card status="danger" style={styles.errorCard}>
            <Text>There was an error retrieving your route from the server!</Text>
            <Text>{error?.message}</Text>
          </Card>
        ) : null}
        {data ? <RouteInfo data={data} /> : null}
      </ScrollView>
      <Spinner show={isLoading} message={'Loading route details...'} />
    </Layout>
  );
}

const METERS_IN_MILES = 1609.34;
export function RouteInfo({ data }) {
  const mapRef = React.useRef(null);

  if (!data) {
    return null;
  }

  const routeCoordinates = lineStringToCoordinates(data.geog);
  const theme = useTheme();
  const mapPadding = PADDING * 3;
  const iosEdgePadding = { top: mapPadding, right: mapPadding, bottom: mapPadding, left: mapPadding };

  const androidEdgePadding = {
    top: PixelRatio.getPixelSizeForLayoutSize(iosEdgePadding.top),
    right: PixelRatio.getPixelSizeForLayoutSize(iosEdgePadding.right),
    bottom: PixelRatio.getPixelSizeForLayoutSize(iosEdgePadding.bottom),
    left: PixelRatio.getPixelSizeForLayoutSize(iosEdgePadding.left),
  };

  const edgePadding = Platform.OS === 'android' ? androidEdgePadding : iosEdgePadding;

  return (
    <SafeAreaView>
      <Map
        innerRef={mapRef}
        style={styles.map}
        isStatic={true}
        initialRegion={extentStringToRegion(data.extent)}
        // this doesn't seem to be working in android...
        mapPadding={edgePadding}
      >
        {data.pickups.map((pickup) => (
          <Marker coordinate={coordsToLocation(pickup.animal_location)} key={pickup.report_id} />
        ))}
        <Polyline coordinates={routeCoordinates} strokeWidth={5} strokeColor={theme['color-info-500']} zIndex={1} />
      </Map>
      <Divider />
      <ValueContainer label="Route ID" value={data.report_id} />
      <ValueContainer label="Submitted" value={dateToString(data.submit_date)} />
      <ValueContainer label="Start" value={dateToString(data.start_time)} />
      <ValueContainer label="End" value={dateToString(data.end_time)} />
      <ValueContainer label="Distance" value={`${(data.distance / METERS_IN_MILES).toFixed(2)} miles`} />
      <ValueContainer label="Pickups" value={data.pickups.length} />
      <Divider />
      {data.pickups.map((pickup) => (
        <>
          <ReportListItem item={pickup} key={pickup.report_id} />
          <Divider />
        </>
      ))}
    </SafeAreaView>
  );
}
RouteInfo.propTypes = {
  data: propTypes.object.isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    height: 200,
  },
});
