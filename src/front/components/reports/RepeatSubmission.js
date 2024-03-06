import { Text, Toggle } from '@ui-kitten/components';
import propTypes from 'prop-types';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import t from '../../services/localization';
import { PADDING } from '../../services/styles';

function RepeatSubmission({ checked, onChange, style }) {
  return (
    <View style={style}>
      <Text category="h6">
        {t('components.reports.repeatSubmission.reportedBefore')}
      </Text>
      {checked ? (
        <Text category="p2">
          {t('components.reports.repeatSubmission.alertText')}
        </Text>
      ) : null}
      <View style={styles.toggleContainer}>
        <Toggle checked={checked} onChange={onChange} style={styles.toggle}>
          {checked ? t('yes') : t('no')}
        </Toggle>
      </View>
    </View>
  );
}

RepeatSubmission.propTypes = {
  checked: propTypes.bool,
  onChange: propTypes.func.isRequired,
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
