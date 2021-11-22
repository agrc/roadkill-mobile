import { useNavigation } from '@react-navigation/native';
import { Card, Divider, Layout, List, ListItem, Text, useTheme } from '@ui-kitten/components';
import ky from 'ky';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from 'react-query';
import * as Sentry from 'sentry-expo';
import useAuth from '../auth/context';
import Spinner from '../components/Spinner';
import config from '../services/config';
import { getIcon } from '../services/icons';
import { PADDING } from '../services/styles';

export default function MyReportsScreen() {
  const { getBearerToken } = useAuth();
  const getMyReports = async () => {
    const token = await getBearerToken();
    let responseJson;
    try {
      responseJson = await ky
        .get(`${config.API}/reports/reports`, {
          headers: {
            Authorization: token,
          },
        })
        .json();

      return responseJson.reports;
    } catch (error) {
      Sentry.Native.captureException(error);
      throw new Error(`Error getting reports from server! ${error.message}`);
    }
  };

  const { data, isLoading, isError, error } = useQuery(config.QUERY_KEYS.reports, getMyReports);
  const theme = useTheme();
  const ArrowIcon = getIcon({
    pack: 'eva',
    name: 'arrow-forward',
    color: theme['color-basic-800'],
    size: 24,
  });
  const navigation = useNavigation();

  return (
    <Layout style={{ flex: 1 }}>
      {isError ? (
        <Card status="danger" style={styles.errorCard}>
          <Text>There was an error retrieving your reports from the server!</Text>
          <Text>{error?.message}</Text>
        </Card>
      ) : null}
      {data ? (
        data.length ? (
          <List
            data={data}
            ItemSeparatorComponent={Divider}
            renderItem={({ item }) => (
              <ListItem
                key={item.report_id}
                title={`${item.species}`}
                description={`${new Date(item.submit_date).toLocaleString()}`}
                accessoryRight={ArrowIcon}
                onPress={() => navigation.navigate('Report Info', { reportId: item.report_id })}
              />
            )}
          />
        ) : (
          <View style={{ margin: PADDING }}>
            <Text>You have no reports.</Text>
          </View>
        )
      ) : null}
      <Spinner show={isLoading} message={'Loading your reports...'} />
    </Layout>
  );
}

const styles = StyleSheet.create({
  errorCard: {
    marginHorizontal: PADDING * 2,
  },
});
