import { useNavigation } from '@react-navigation/native';
import { Card, Divider, Layout, List, ListItem, Text, useTheme } from '@ui-kitten/components';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from 'react-query';
import Spinner from '../components/Spinner';
import { useAPI } from '../services/api';
import config from '../services/config';
import { getIcon } from '../services/icons';
import { PADDING } from '../services/styles';

export default function MyReportsScreen() {
  const { get } = useAPI();
  const getMyReports = async () => {
    const responseJson = await get('reports/reports');

    return responseJson.reports;
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
                title={`${item.common_name}`}
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
