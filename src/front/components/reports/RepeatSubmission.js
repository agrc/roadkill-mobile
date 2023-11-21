import { Text, Toggle } from '@ui-kitten/components';
import propTypes from 'prop-types';
import { memo } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import t from '../../services/localization';
import { PADDING } from '../../services/styles';

function RepeatSubmission({ checked, onChange, cancelReport, style }) {
  const onToggle = (newValue) => {
    if (newValue) {
      // note: if this text is used as the title, it gets cut off in the alert box on android
      Alert.alert(null, t('components.reports.repeatSubmission.alertText'), [
        {
          text: t('components.reports.repeatSubmission.continue'),
        },
        {
          text: t('components.reports.repeatSubmission.cancel'),
          onPress: cancelReport,
          style: 'cancel',
        },
      ]);
    }
    onChange(newValue);
  };

  return (
    <View style={style}>
      <Text category="h6">
        {t('components.reports.repeatSubmission.reportedBefore')}
      </Text>
      <View style={styles.toggleContainer}>
        <Toggle checked={checked} onChange={onToggle} style={styles.toggle}>
          {checked ? t('yes') : t('no')}
        </Toggle>
      </View>
    </View>
  );
}

RepeatSubmission.propTypes = {
  checked: propTypes.bool,
  onChange: propTypes.func.isRequired,
  cancelReport: propTypes.func.isRequired,
  style: propTypes.object,
};

export default memo(RepeatSubmission);

const styles = StyleSheet.create({
  toggle: {
    marginTop: PADDING / 2,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
