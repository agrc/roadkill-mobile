import { useQuery } from '@tanstack/react-query';
import { Card, Divider, Layout, Text } from '@ui-kitten/components';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import * as Sentry from 'sentry-expo';
import CachedData from '../components/CachedData';
import ReportListItem from '../components/ReportListItem';
import RouteListItem from '../components/RouteListItem';
import Spinner from '../components/Spinner';
import { useAPI } from '../services/api';
import config from '../services/config';
import t from '../services/localization';
import { getOfflineSubmission, useOfflineCache } from '../services/offline';
import { PADDING } from '../services/styles';

export default function MyReportsScreen() {
  const { get } = useAPI();
  const { cachedSubmissionIds, isConnected } = useOfflineCache();
  const getSubmissions = async () => {
    try {
      if (isConnected) {
        const responseJson = await get('submissions');

        return responseJson.submissions;
      }

      return null;
    } catch (error) {
      Sentry.Native.captureException(error);

      return null;
    }
  };

  const [offlineSubmissions, setOfflineSubmissions] = React.useState([]);

  React.useEffect(() => {
    const getSubmissionData = async () => {
      const promises = cachedSubmissionIds.map((id) =>
        getOfflineSubmission(id),
      );
      const newSubmissions = await Promise.all(promises);

      setOfflineSubmissions(newSubmissions.filter((submission) => submission));
    };

    if (cachedSubmissionIds.length) {
      getSubmissionData();
    } else {
      setOfflineSubmissions([]);
    }
  }, [cachedSubmissionIds]);

  const { data, isPending, isError, error } = useQuery({
    queryKey: [config.QUERY_KEYS.submissions],
    queryFn: getSubmissions,
  });

  return (
    <Layout style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: PADDING * 2 }}>
        <CachedData data={offlineSubmissions} />
        {!isConnected ? (
          <View style={{ margin: PADDING }}>
            <Text>{t('screens.myReports.offlineMessage')}</Text>
          </View>
        ) : null}
        {isError ? (
          <Card status="danger" style={styles.errorCard}>
            <Text>{t('screens.myReports.errorLoadingSubmissions')}</Text>
            <Text>{error?.message}</Text>
          </Card>
        ) : null}
        {data ? (
          data.length ? (
            data.map((item) => (
              <View
                key={
                  item.report_id
                    ? `report_${item.report_id}`
                    : `route_${item.route_id}`
                }
              >
                {item.report_id ? (
                  <ReportListItem item={item} />
                ) : (
                  <RouteListItem item={item} />
                )}
                <Divider />
              </View>
            ))
          ) : (
            <View style={{ margin: PADDING }}>
              <Text>{t('screens.myReports.noSubmissions')}</Text>
            </View>
          )
        ) : null}
      </ScrollView>
      <Spinner
        show={isPending}
        message={t('screens.myReports.loadingSubmissions')}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  errorCard: {
    marginHorizontal: PADDING * 2,
  },
});
