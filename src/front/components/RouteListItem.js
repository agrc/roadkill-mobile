import { useNavigation } from '@react-navigation/native';
import { ListItem, useTheme } from '@ui-kitten/components';
import propTypes from 'prop-types';
import { getArrowIcon } from '../services/icons';
import t from '../services/localization';
import useStyles from '../services/styles';
import { dateToString } from '../services/utilities';

export default function RouteListItem({ item }) {
  const theme = useTheme();
  const navigation = useNavigation();
  const commonStyles = useStyles();

  return (
    <ListItem
      title={`${t('route')} ${item.route_id || `(${t('unsubmitted')})`}`}
      description={`${dateToString(item.start_time)}`}
      accessoryRight={getArrowIcon(theme)}
      onPress={() =>
        navigation.navigate('Route Info', {
          routeId: item.route_id,
          offlineStorageId: item.offlineStorageId,
        })
      }
      style={item.offlineStorageId ? commonStyles.offlineItem : null}
    />
  );
}
RouteListItem.propTypes = {
  item: propTypes.object.isRequired,
};
