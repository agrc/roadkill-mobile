import { Text, useTheme } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function AlertIcon({ number }) {
  const theme = useTheme();

  const style = {
    backgroundColor: theme['color-success-800'],
  };

  return (
    <View style={[styles.container, style]}>
      <Text category="label" style={styles.textStyle}>
        {number}
      </Text>
    </View>
  );
}
AlertIcon.propTypes = {
  number: propTypes.number,
};

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    right: 0,
    borderRadius: 5000,
    minWidth: 15,
  },
  // eslint-disable-next-line react-native/no-color-literals
  textStyle: {
    color: 'white',
    paddingHorizontal: 3,
  },
});
