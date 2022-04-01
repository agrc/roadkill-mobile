import { Card, Divider, Layout, Text } from '@ui-kitten/components';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from 'react-query';
import CachedData from '../components/CachedData';
import ReportListItem from '../components/ReportListItem';
import RouteListItem from '../components/RouteListItem';
import Spinner from '../components/Spinner';
import { useAPI } from '../services/api';
import config from '../services/config';
import { getOfflineSubmission, useOfflineCache } from '../services/offline';
import { PADDING } from '../services/styles';

export default function MyReportsScreen() {
  const { get } = useAPI();
  const getSubmissions = async () => {
    const responseJson = await get('submissions');
    return responseJson.submissions;
  };

  const { cachedSubmissionIds } = useOfflineCache();
  const [offlineSubmissions, setOfflineSubmissions] = React.useState([]);

  React.useEffect(() => {
    const getSubmissionData = async () => {
      const promises = cachedSubmissionIds.map((id) => getOfflineSubmission(id));
      const newSubmissions = await Promise.all(promises);

      setOfflineSubmissions(newSubmissions.filter((submission) => submission));
    };

    if (cachedSubmissionIds.length) {
      getSubmissionData();
    } else {
      setOfflineSubmissions([]);
    }
  }, [cachedSubmissionIds]);

  const { data, isLoading, isError, error } = useQuery(config.QUERY_KEYS.submissions, getSubmissions);

  return (
    <Layout style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: PADDING * 2 }}>
        <CachedData data={offlineSubmissions} />
        {isError ? (
          <Card status="danger" style={styles.errorCard}>
            <Text>There was an error retrieving your previously submitted data from the server!</Text>
            <Text>{error?.message}</Text>
          </Card>
        ) : null}
        {data ? (
          data.length ? (
            data.map((item) => (
              <View key={item.report_id || item.route_id}>
                {item.report_id ? <ReportListItem item={item} /> : <RouteListItem item={item} />}
                <Divider />
              </View>
            ))
          ) : (
            <View style={{ margin: PADDING }}>
              <Text>You have no submissions.</Text>
            </View>
          )
        ) : null}
      </ScrollView>
      <Spinner show={isLoading} message={'Loading your submissions...'} />
    </Layout>
  );
}

const styles = StyleSheet.create({
  errorCard: {
    marginHorizontal: PADDING * 2,
  },
});
