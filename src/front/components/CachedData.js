import { Button, Divider } from '@ui-kitten/components';
import propTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import { getIcon } from '../services/icons';
import t from '../services/localization';
import { useOfflineCache } from '../services/offline';
import { PADDING } from '../services/styles';
import ReportListItem from './ReportListItem';
import RouteListItem from './RouteListItem';
import Spinner from './Spinner';

export default function CachedData({ data }) {
  const { submitOfflineSubmissions, isSubmitting, isConnected } =
    useOfflineCache();

  const submit = async () => {
    await submitOfflineSubmissions();
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <>
      <Button
        status="info"
        style={styles.button}
        accessoryLeft={getIcon({ pack: 'font-awesome', name: 'refresh' })}
        onPress={submit}
        disabled={!isConnected || isSubmitting}
      >
        {t('components.cachedData.sendReports')}
      </Button>
      <Divider />
      {data.map((item) => (
        <View key={item.offlineStorageId}>
          {item.animal_location ? (
            <ReportListItem item={item} />
          ) : (
            <RouteListItem item={item} />
          )}
          <Divider />
        </View>
      ))}
      <Spinner
        show={isSubmitting}
        message={`${t('components.cachedData.submittingData')}...`}
      />
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
