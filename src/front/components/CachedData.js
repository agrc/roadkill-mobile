import { Button, Divider } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { getIcon } from '../services/icons';
import { useOfflineCache } from '../services/offline';
import { PADDING } from '../services/styles';
import ReportListItem from './ReportListItem';
import RouteListItem from './RouteListItem';
import Spinner from './Spinner';

export default function CachedData({ data }) {
  if (data.length === 0) {
    return null;
  }
  const { submitOfflineSubmissions, isSubmitting, isConnected } = useOfflineCache();

  const submit = async () => {
    const errorMessage = await submitOfflineSubmissions();

    if (errorMessage) {
      Alert.alert('Submission Error', errorMessage);
    }
  };

  return (
    <>
      <Button
        status="info"
        style={styles.button}
        accessoryLeft={getIcon({ pack: 'font-awesome', name: 'refresh' })}
        onPress={submit}
        disabled={!isConnected || isSubmitting}
      >
        Send Unsubmitted Reports
      </Button>
      <Divider />
      {data.map((item) => (
        <View key={item.offlineStorageId}>
          {item.animal_location ? <ReportListItem item={item} /> : <RouteListItem item={item} />}
          <Divider />
        </View>
      ))}
      <Spinner show={isSubmitting} message="Submitting data..." />
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