import { Spinner as KittenSpinner, Text, useTheme } from '@ui-kitten/components';
import propTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import useStyles, { PADDING } from '../services/styles';

export default function Spinner({ show, message }) {
  const theme = useTheme();
  const commonStyles = useStyles();

  return show ? (
    <View
      style={[styles.loader, commonStyles.roundedBorders, { backgroundColor: theme['color-basic-transparent-600'] }]}
    >
      <KittenSpinner color={theme['color-basic-1100']} size="large" status="control" />
      {message ? (
        <Text category="h6" style={[{ color: theme['color-basic-900'] }, styles.message]}>
          {message}
        </Text>
      ) : null}
    </View>
  ) : null;
}
Spinner.propTypes = {
  show: propTypes.bool.isRequired,
  message: propTypes.string,
};

const styles = StyleSheet.create({
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1000,
  },
  message: {
    marginTop: PADDING,
  },
});
