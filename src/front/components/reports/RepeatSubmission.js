import { Text, Toggle } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { Alert, StyleSheet } from 'react-native';
import { PADDING } from '../../styles';

export default function RepeatSubmission({ checked, onChange, cancelReport }) {
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
    <>
      <Text appearance="hint">Have you reported this animal before?</Text>
      <Toggle checked={checked} onChange={onToggle} style={styles.toggle}>
        {checked ? 'Yes' : 'No'}
      </Toggle>
    </>
  );
}

RepeatSubmission.propTypes = {
  checked: propTypes.bool,
  onChange: propTypes.func.isRequired,
  cancelReport: propTypes.func.isRequired,
};

const styles = StyleSheet.create({
  toggle: {
    marginVertical: PADDING,
  },
});
