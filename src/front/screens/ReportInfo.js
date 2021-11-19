import { useNavigation, useRoute } from '@react-navigation/native';
import { Card, Divider, Layout, Text } from '@ui-kitten/components';
import ky from 'ky';
import propTypes from 'prop-types';
import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { useQuery } from 'react-query';
import * as Sentry from 'sentry-expo';
import useAuth from '../auth/context';
import Map from '../components/Map';
import Spinner from '../components/Spinner';
import ValueContainer from '../components/ValueContainer';
import config from '../config';
import { coordsToLocation } from '../location';
import useStyles, { PADDING } from '../styles';
import { dateToString } from '../utilities';

const isPickupReport = (report) => {
  return report.pickup_date !== null;
};

const booleanToYesNo = (bool) => (bool ? 'yes' : 'no');

export default function ReportInfoScreen() {
  const { reportId } = useRoute().params;
  const { getBearerToken } = useAuth();
  const navigation = useNavigation();
  const getReportData = async () => {
    const headers = {
      Authorization: await getBearerToken(),
    };
    let responseJson;
    try {
      responseJson = await ky
        .get(`${config.API}/reports/report/${reportId}`, {
          headers,
        })
        .json();

      return {
        ...responseJson.report,
        headers,
      };
    } catch (error) {
      Sentry.Native.captureException(error);
      throw new Error(`Error getting report from server! ${error.message}`);
    }
  };
  const { data, isLoading, isError, error } = useQuery(`report-${reportId}`, getReportData);

  React.useEffect(() => {
    if (data) {
      navigation.setOptions({
        title: `${isPickupReport(data) ? 'Pickup' : 'Carcass'} Report Info`,
      });
    }
  }, [data]);

  return (
    <Layout style={styles.container}>
      <ScrollView style={styles.container}>
        {isError ? (
          <Card status="danger" style={styles.errorCard}>
            <Text>There was an error retrieving your report from the server!</Text>
            <Text>{error?.message}</Text>
          </Card>
        ) : null}
        <ReportInfo data={data} />
      </ScrollView>
      <Spinner show={isLoading} message={'Loading report details...'} />
    </Layout>
  );
}

export function ReportInfo({ data }) {
  const mapRef = React.useRef(null);
  const commonStyles = useStyles();

  if (!data) {
    return null;
  }

  const animalCoords = coordsToLocation(data.animal_location);

  return (
    <>
      <Map
        style={styles.map}
        isStatic={true}
        innerRef={mapRef}
        maxZoomLevel={16}
        initialCamera={{ center: animalCoords, zoom: 14, pitch: 0, heading: 0 }}
      >
        <Marker coordinate={animalCoords} />
      </Map>
      <Divider />
      <ValueContainer label="Report ID" value={data.report_id} />
      <ValueContainer label="Submitted" value={dateToString(data.submit_date)} />
      <Divider />
      <ValueContainer label="Species" value={data.species} />
      <ValueContainer label="Species Confidence Level" value={data.species_confidence_level} />
      <ValueContainer label="Sex" value={data.sex} />
      <ValueContainer label="Age Class" value={data.age_class} />
      {isPickupReport(data) ? (
        // pickup report
        <ValueContainer label="Pickup Date" value={dateToString(data.pickup_date)} />
      ) : (
        // public report
        <>
          <ValueContainer label="Repeat Submission" value={booleanToYesNo(data.repeat_submission)} />
          <ValueContainer label="Discovery Date" value={dateToString(data.discovery_date)} />
        </>
      )}
      <Divider />
      <ValueContainer label="Comments" value={data.comments} />
      {data.photo_id ? (
        <>
          <View style={styles.photoContainer}>
            <View style={{ marginLeft: -PADDING, flex: 1 }}>
              <ValueContainer label="Photo ID" value={data.photo_id} divider={false} />
              <ValueContainer label="Photo Date" value={dateToString(data.photo_date)} divider={false} />
            </View>
            <Image
              source={{ uri: `${config.API}/photos/thumb/${data.photo_id}`, headers: data.headers }}
              style={[commonStyles.image, styles.thumbnail]}
            />
          </View>
          <Divider />
        </>
      ) : null}
    </>
  );
}
ReportInfo.propTypes = {
  data: propTypes.object,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    height: 200,
  },
  thumbnail: {
    height: 75,
    width: 75,
  },
  photoContainer: {
    flex: 1,
    padding: PADDING,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
});
