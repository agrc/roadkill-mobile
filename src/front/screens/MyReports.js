import { useNavigation } from '@react-navigation/native';
import { Card, Divider, Layout, List, ListItem, Text, useTheme } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from 'react-query';
import Spinner from '../components/Spinner';
import { useAPI } from '../services/api';
import config from '../services/config';
import { getIcon } from '../services/icons';
import { PADDING } from '../services/styles';

function getArrowIcon(theme) {
  return getIcon({
    pack: 'eva',
    name: 'arrow-forward',
    color: theme['color-basic-800'],
    size: 24,
  });
}

export function ReportListItem({ item }) {
  const navigation = useNavigation();
  const theme = useTheme();

  return (
    <ListItem
      key={item.report_id}
      title={`${item.common_name}`}
      description={`${new Date(item.submit_date).toLocaleString()}`}
      accessoryRight={getArrowIcon(theme)}
      onPress={() => navigation.navigate('Report Info', { reportId: item.report_id })}
    />
  );
}
ReportListItem.propTypes = {
  item: propTypes.object.isRequired,
};

export default function MyReportsScreen() {
  const { get } = useAPI();
  const getSubmissions = async () => {
    const responseJson = await get('submissions');

    return responseJson.submissions;
  };

  const { data, isLoading, isError, error } = useQuery(config.QUERY_KEYS.submissions, getSubmissions);

  const theme = useTheme();
  const navigation = useNavigation();
  function RouteListItem({ item }) {
    return (
      <ListItem
        key={item.route_id}
        title={`Route ${item.route_id}`}
        description={`${new Date(item.start_time).toLocaleString()}`}
        accessoryRight={getArrowIcon(theme)}
        onPress={() => navigation.navigate('Route Info', { routeId: item.route_id })}
      />
    );
  }
  RouteListItem.propTypes = {
    item: propTypes.object.isRequired,
  };

  return (
    <Layout style={{ flex: 1 }}>
      {isError ? (
        <Card status="danger" style={styles.errorCard}>
          <Text>There was an error retrieving your submissions from the server!</Text>
          <Text>{error?.message}</Text>
        </Card>
      ) : null}
      {data ? (
        data.length ? (
          <List
            data={data}
            ItemSeparatorComponent={Divider}
            renderItem={({ item }) => {
              return item.report_id ? <ReportListItem item={item} /> : <RouteListItem item={item} />;
            }}
          />
        ) : (
          <View style={{ margin: PADDING }}>
            <Text>You have no submissions.</Text>
          </View>
        )
      ) : null}
      <Spinner show={isLoading} message={'Loading your submissions...'} />
    </Layout>
  );
}

const styles = StyleSheet.create({
  errorCard: {
    marginHorizontal: PADDING * 2,
  },
});
