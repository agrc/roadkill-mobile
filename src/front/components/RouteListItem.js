import { useNavigation } from '@react-navigation/native';
import { ListItem, useTheme } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { getArrowIcon } from '../services/icons';
import useStyles from '../services/styles';

export default function RouteListItem({ item }) {
  const theme = useTheme();
  const navigation = useNavigation();
  const commonStyles = useStyles();

  return (
    <ListItem
      title={`Route ${item.route_id || '(unsubmitted)'}`}
      description={`${new Date(item.start_time).toLocaleString()}`}
      accessoryRight={getArrowIcon(theme)}
      onPress={() =>
        navigation.navigate('Route Info', { routeId: item.route_id, offlineStorageId: item.offlineStorageId })
      }
      style={item.offlineStorageId ? commonStyles.offlineItem : null}
    />
  );
}
RouteListItem.propTypes = {
  item: propTypes.object.isRequired,
};