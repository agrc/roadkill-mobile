import { useNavigation } from '@react-navigation/native';
import { ListItem, useTheme } from '@ui-kitten/components';
import propTypes from 'prop-types';
import { getArrowIcon } from '../services/icons';
import t from '../services/localization';
import useStyles from '../services/styles';
import { dateToString } from '../services/utilities';

export default function ReportListItem({ item, offlineRouteId, offlineIndex }) {
  const navigation = useNavigation();
  const theme = useTheme();
  const commonStyles = useStyles();

  return (
    <ListItem
      title={`${item.common_name}${
        !item.report_id ? ` (${t('unsubmitted')})` : ''
      }`}
      description={`${dateToString(item.submit_date)}`}
      accessoryRight={getArrowIcon(theme)}
      onPress={() =>
        navigation.navigate('Report Info', {
          reportId: item.report_id,
          offlineStorageId: item.offlineStorageId,
          offlineRouteId: offlineRouteId,
          offlineIndex: offlineIndex,
        })
      }
      style={item.offlineStorageId ? commonStyles.offlineItem : null}
    />
  );
}
ReportListItem.propTypes = {
  item: propTypes.object.isRequired,
  offlineRouteId: propTypes.number,
  offlineIndex: propTypes.number,
};
