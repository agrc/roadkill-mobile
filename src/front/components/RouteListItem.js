import { useNavigation } from '@react-navigation/native';
import { ListItem, useTheme } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { getArrowIcon } from '../services/icons';

export function RouteListItem({ item }) {
  const theme = useTheme();
  const navigation = useNavigation();

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
