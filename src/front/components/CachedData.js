import { Button, Divider } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { getIcon } from '../services/icons';
import { PADDING } from '../services/styles';
import { ReportListItem } from './ReportListItem';
import { RouteListItem } from './RouteListItem';

export default function CachedData({ data }) {
  if (data.length === 0) {
    return null;
  }

  return (
    <>
      <Button status="info" style={styles.button} accessoryLeft={getIcon({ pack: 'font-awesome', name: 'refresh' })}>
        Send Unsubmitted Reports
      </Button>
      <Divider />
      {data.map((item) => (
        <View key={item.offlineStorageId}>
          {item.animal_location ? <ReportListItem item={item} /> : <RouteListItem item={item} />}
          <Divider />
        </View>
      ))}
    </>
  );
}
CachedData.propTypes = {
  data: propTypes.array.isRequired,
};

const styles = StyleSheet.create({
  button: {
    marginVertical: PADDING,
    marginHorizontal: PADDING * 2,
  },
});
