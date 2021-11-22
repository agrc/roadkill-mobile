import { Divider, Text } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PADDING } from '../services/styles';

export default function ValueContainer({ label, value, divider = true }) {
  return (
    <>
      <View style={styles.valueContainer}>
        <Text category="s1">{label}</Text>
        <Text>{value}</Text>
      </View>
      {divider ? <Divider /> : null}
    </>
  );
}
ValueContainer.propTypes = {
  label: propTypes.string.isRequired,
  value: propTypes.any,
  divider: propTypes.bool,
};

const styles = StyleSheet.create({
  valueContainer: {
    flex: 1,
    padding: PADDING,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
});
