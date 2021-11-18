import { useNavigation, useRoute } from '@react-navigation/native';
import { Card, Divider, Layout, Text } from '@ui-kitten/components';
import ky from 'ky';
import propTypes from 'prop-types';
import React, { useRef } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { PressableOpacity } from 'react-native-pressable-opacity';
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

const SUBMIT_COLOR = 'indigo';
const ANIMAL_COLOR = 'red';
const PHOTO_COLOR = 'blue';
const HIGHLIGHT_COLOR = 'gold';
export function ReportInfo({ data }) {
  const [submitColor, setSubmitColor] = React.useState(SUBMIT_COLOR);
  const [animalColor, setAnimalColor] = React.useState(ANIMAL_COLOR);
  const [photoColor, setPhotoColor] = React.useState(PHOTO_COLOR);
  const mapRef = React.useRef(null);
  const commonStyles = useStyles();

  if (!data) {
    return null;
  }

  let submitCoords, animalCoords, photoCoords, allCoords;
  if (data) {
    submitCoords = coordsToLocation(data.submit_location);
    animalCoords = coordsToLocation(data.animal_location);
    photoCoords = coordsToLocation(data.photo_location);
    allCoords = [submitCoords, animalCoords, photoCoords].filter((value) => value);
  }
  const EDGE_PADDING = 45;

  return (
    <>
      <Map
        style={styles.map}
        isStatic={true}
        innerRef={mapRef}
        maxZoomLevel={16}
        onLayout={() => {
          mapRef.current.fitToCoordinates(allCoords, {
            animated: false,
            edgePadding: {
              top: EDGE_PADDING,
              right: EDGE_PADDING / 2,
              bottom: EDGE_PADDING / 4,
              left: EDGE_PADDING / 2,
            },
          });
        }}
      >
        <Marker coordinate={submitCoords} pinColor={submitColor} />
        <Marker coordinate={animalCoords} pinColor={animalColor} />
        {data.photo_location ? <Marker coordinate={photoCoords} pinColor={photoColor} /> : null}
      </Map>
      <Divider />
      <ValueContainer label="Report ID" value={data.report_id} />
      <ValueWithLegend color={submitColor} setColor={setSubmitColor}>
        <ValueContainer label="Submitted" value={dateToString(data.submit_date)} />
      </ValueWithLegend>
      <Divider />
      <ValueContainer label="Species" value={data.species} />
      <ValueContainer label="Species Confidence Level" value={data.species_confidence_level} />
      <ValueContainer label="Sex" value={data.sex} />
      <ValueContainer label="Age Class" value={data.age_class} />
      {isPickupReport(data) ? (
        // pickup report
        <ValueWithLegend color={animalColor} setColor={setAnimalColor}>
          <ValueContainer label="Pickup Date" value={dateToString(data.pickup_date)} />
        </ValueWithLegend>
      ) : (
        // public report
        <>
          <ValueContainer label="Repeat Submission" value={data.repeat_submission.toString()} />
          <ValueWithLegend color={animalColor} setColor={setAnimalColor}>
            <ValueContainer label="Discovery Date" value={dateToString(data.discovery_date)} />
          </ValueWithLegend>
        </>
      )}
      <Divider />
      <ValueContainer label="Comments" value={data.comments} />
      {data.photo_id ? (
        <>
          <ValueWithLegend color={photoColor} setColor={setPhotoColor} hideLegend={data.photo_location === null}>
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
          </ValueWithLegend>
          <Divider />
        </>
      ) : null}
    </>
  );
}
ReportInfo.propTypes = {
  data: propTypes.object,
};

function ValueWithLegend({ children, setColor, color, hideLegend }) {
  const originalColor = useRef(color);

  return (
    <PressableOpacity
      onPressIn={() => setColor(HIGHLIGHT_COLOR)}
      onPressOut={() => setColor(originalColor.current)}
      style={styles.legendContainer}
    >
      {children}
      {!hideLegend ? <View style={[styles.legendSwatch, { backgroundColor: originalColor.current }]} /> : null}
    </PressableOpacity>
  );
}
ValueWithLegend.propTypes = {
  setColor: propTypes.func.isRequired,
  color: propTypes.string.isRequired,
  children: propTypes.node.isRequired,
  hideLegend: propTypes.bool,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    height: 200,
  },
  legendContainer: {
    flexDirection: 'row',
  },
  legendSwatch: {
    width: 5,
    height: '100%',
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
