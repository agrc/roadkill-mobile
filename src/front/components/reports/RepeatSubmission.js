import { Text, Toggle } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { PADDING } from '../../services/styles';

export default function RepeatSubmission({ checked, onChange, cancelReport, style }) {
  const onToggle = (newValue) => {
    if (newValue) {
      // note: if this text is used as the title, it gets cut off in the alert box on android
      Alert.alert(null, 'Please understand that it may take up to two weeks for a reported animal to be removed.', [
        {
          text: 'Continue with repeat submission',
        },
        {
          text: 'Cancel submission',
          onPress: cancelReport,
          style: 'cancel',
        },
      ]);
    }
    onChange(newValue);
  };

  return (
    <View style={style}>
      <Text category="h6">Have you reported this animal before?</Text>
      <Toggle checked={checked} onChange={onToggle} style={styles.toggle}>
        {checked ? 'Yes' : 'No'}
      </Toggle>
    </View>
  );
}

RepeatSubmission.propTypes = {
  checked: propTypes.bool,
  onChange: propTypes.func.isRequired,
  cancelReport: propTypes.func.isRequired,
  style: propTypes.object,
};

const styles = StyleSheet.create({
  toggle: {
    marginTop: PADDING / 2,
  },
});
