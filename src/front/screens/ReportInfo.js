import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Card, Divider, Layout, Text } from '@ui-kitten/components';
import commonConfig from 'common/config';
import propTypes from 'prop-types';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuth from '../auth/context';
import Map from '../components/Map';
import Spinner from '../components/Spinner';
import ValueContainer from '../components/ValueContainer';
import { useAPI } from '../services/api';
import config from '../services/config';
import { coordsToLocation } from '../services/location';
import { getOfflineSubmission } from '../services/offline';
import useStyles, { PADDING } from '../services/styles';
import {
  booleanToYesNo,
  dateToString,
  isPickupReport,
} from '../services/utilities';

export default function ReportInfoScreen() {
  const { reportId, offlineStorageId, offlineRouteId, offlineIndex } =
    useRoute().params;
  // offlineRouteId & offlineIndex are only populated for reports associated with offline routes
  const navigation = useNavigation();
  const { get } = useAPI();

  const { getBearerToken } = useAuth();
  const getReportData = async () => {
    if (reportId) {
      const responseJson = await get(`reports/report/${reportId}`);

      return {
        ...responseJson.report,
        bearerToken: await getBearerToken(),
      };
    } else {
      const offlineSubmission = await getOfflineSubmission(
        offlineStorageId || offlineRouteId,
        offlineIndex,
      );

      return offlineSubmission;
    }
  };
  const { data, isPending, isError, error } = useQuery({
    queryKey: [`report-${reportId}`],
    queryFn: getReportData,
  });

  React.useEffect(() => {
    if (data) {
      navigation.setOptions({
        title: `${isPickupReport(data) ? 'Pickup' : 'Carcass'} Report Info`,
      });
    }
  }, [data, navigation]);

  return (
    <Layout style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.container}>
          {isError ? (
            <Card status="danger" style={styles.errorCard}>
              <Text>
                There was an error retrieving your report from the server!
              </Text>
              <Text>{error?.message}</Text>
            </Card>
          ) : null}
          <ReportInfo data={data} />
        </ScrollView>
      </SafeAreaView>
      <Spinner show={isPending} message={'Loading report details...'} />
    </Layout>
  );
}

function Photo({ photo_id, offlinePhoto, date, bearerToken }) {
  const navigation = useNavigation();
  const commonStyles = useStyles();

  if (!photo_id && !offlinePhoto) {
    return null;
  }

  const uri = photo_id
    ? `${config.API}/photos/thumb/${photo_id}`
    : offlinePhoto.uri;

  return (
    <>
      <View style={styles.photoContainer}>
        <View style={{ marginLeft: -PADDING, flex: 1 }}>
          <ValueContainer
            label="Photo ID"
            value={photo_id || '(unsubmitted)'}
            divider={false}
          />
          <ValueContainer
            label="Photo Date"
            value={dateToString(date)}
            divider={false}
          />
        </View>
        <Pressable
          onPress={() => {
            navigation.navigate('Image', { uri: uri.replace('/thumb', '') });
          }}
        >
          <Image
            source={{
              uri,
              headers: {
                Authorization: bearerToken,
                [commonConfig.versionHeaderName]: commonConfig.apiVersion,
              },
            }}
            style={[commonStyles.image, styles.thumbnail]}
          />
        </Pressable>
      </View>
      <Divider />
    </>
  );
}
Photo.propTypes = {
  photo_id: propTypes.number,
  offlinePhoto: propTypes.shape({
    uri: propTypes.string,
  }),
  date: propTypes.string,
  bearerToken: propTypes.string,
};

export function ReportInfo({ data }) {
  const mapRef = React.useRef(null);

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
        // zoom is for Google Maps and altitude is for Apple Maps
        initialCamera={{
          center: animalCoords,
          zoom: 14,
          pitch: 0,
          heading: 0,
          altitude: 2500,
        }}
      >
        <Marker coordinate={animalCoords} />
      </Map>
      <Divider />
      <ValueContainer
        label="Report ID"
        value={data.report_id || '(unsubmitted)'}
      />
      <ValueContainer
        label="Submitted"
        value={dateToString(data.submit_date)}
      />
      <Divider />
      <ValueContainer label="Common Name" value={data.common_name} />
      <ValueContainer label="Scientific Name" value={data.scientific_name} />
      <ValueContainer label="Type" value={data.species_type} />
      <ValueContainer label="Class" value={data.species_class} />
      <ValueContainer label="Order" value={data.species_order} />
      <ValueContainer label="Family" value={data.family} />
      <ValueContainer
        label="Species Confidence Level"
        value={data.species_confidence_level}
      />
      <ValueContainer label="Sex" value={data.sex} />
      <ValueContainer label="Age Class" value={data.age_class} />
      {isPickupReport(data) ? (
        // pickup report
        <ValueContainer
          label="Pickup Date"
          value={dateToString(data.pickup_date, false)}
        />
      ) : (
        // public report
        <>
          <ValueContainer
            label="Repeat Submission"
            value={booleanToYesNo(data.repeat_submission)}
          />
          <ValueContainer
            label="Discovery Date"
            value={dateToString(data.discovery_date, false)}
          />
        </>
      )}
      <Divider />
      <ValueContainer label="Comments" value={data.comments} />
      <Photo
        photo_id={data.photo_id}
        offlinePhoto={data.photo}
        date={data.photo_date}
        bearerToken={data.bearerToken}
      />
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
    height: commonConfig.reportPhotoThumbnailSize,
    width: commonConfig.reportPhotoThumbnailSize,
  },
  photoContainer: {
    flex: 1,
    padding: PADDING,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
});
