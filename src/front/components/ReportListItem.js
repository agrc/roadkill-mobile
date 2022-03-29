import { useNavigation } from '@react-navigation/native';
import { ListItem, useTheme } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { getArrowIcon } from '../services/icons';
import useStyles from '../services/styles';

export function ReportListItem({ item }) {
  const navigation = useNavigation();
  const theme = useTheme();
  const commonStyles = useStyles();

  return (
    <ListItem
      key={item.report_id}
      title={`${item.common_name}${item.offlineStorageId ? ' (unsubmitted)' : ''}`}
      description={`${new Date(item.submit_date).toLocaleString()}`}
      accessoryRight={getArrowIcon(theme)}
      onPress={() => navigation.navigate('Report Info', { reportId: item.report_id })}
      style={item.offlineStorageId ? commonStyles.offlineItem : null}
    />
  );
}
ReportListItem.propTypes = {
  item: propTypes.object.isRequired,
};
