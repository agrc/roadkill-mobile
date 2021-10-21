import { useRoute } from '@react-navigation/native';
import { Card, Layout, Text } from '@ui-kitten/components';
import ky from 'ky';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useQuery } from 'react-query';
import * as Sentry from 'sentry-expo';
import useAuth from '../auth/context';
import Spinner from '../components/Spinner';
import config from '../config';
import { PADDING } from '../styles';

export default function ReportInfoScreen() {
  const { reportId } = useRoute().params;
  const { getBearerToken } = useAuth();
  const getReportData = async () => {
    const token = await getBearerToken();
    let responseJson;
    try {
      responseJson = await ky
        .get(`${config.API}/reports/report/${reportId}`, {
          headers: {
            Authorization: token,
          },
        })
        .json();

      return responseJson.report;
    } catch (error) {
      Sentry.Native.captureException(error);
      throw new Error(`Error getting report from server! ${error.message}`);
    }
  };
  const { data, isLoading, isError, error } = useQuery('report', getReportData);

  return (
    <Layout style={styles.container}>
      {isError ? (
        <Card status="danger" style={styles.errorCard}>
          <Text>There was an error retrieving your report from the server!</Text>
          <Text>{error?.message}</Text>
        </Card>
      ) : null}
      <Text>{JSON.stringify(data, null, '  ')}</Text>
      <Spinner show={isLoading} message={'Loading report details...'} />
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: PADDING,
  },
});
