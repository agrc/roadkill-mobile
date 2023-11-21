import { Button, Text, useTheme } from '@ui-kitten/components';
import propTypes from 'prop-types';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { PADDING } from '../../services/styles';

function RadioPills({ options, value, onChange, label, style }) {
  return (
    <View style={style}>
      {label ? <Text category="label">{label}</Text> : null}
      <View style={styles.container}>
        {options.map((option, index) => (
          <Pill option={option} value={value} onChange={onChange} key={index} />
        ))}
      </View>
    </View>
  );
}

export default memo(RadioPills);

RadioPills.propTypes = {
  options: propTypes.array.isRequired,
  value: propTypes.string,
  onChange: propTypes.func.isRequired,
  label: propTypes.string,
  style: propTypes.object,
};

function Pill({ option, value, onChange }) {
  const theme = useTheme();
  let optionValue;
  let optionLabel;
  if (typeof option === 'string') {
    // after i18n, is this format used anymore?
    optionValue = option;
    optionLabel = option;
  } else {
    optionValue = option.value;
    optionLabel = option.label;
  }
  const isUnknown = optionValue.toLowerCase() === 'unknown';
  const isSelected = optionValue === value;
  const onPress = () => onChange(optionValue);
  const style = [
    styles.pill,
    isUnknown && isSelected
      ? {
          backgroundColor: theme['color-basic-500'],
          borderColor: theme['color-basic-500'],
        }
      : null,
  ];

  return (
    <Button
      key={optionValue}
      appearance={isSelected ? 'filled' : 'outline'}
      onPress={onPress}
      style={style}
      status={isUnknown ? 'basic' : 'primary'}
      size="small"
    >
      {(evaProps) => (
        <Text
          {...evaProps}
          style={[
            evaProps.style,
            styles.capitalize,
            { color: theme['color-basic-800'] },
          ]}
        >
          {optionLabel}
        </Text>
      )}
    </Button>
  );
}

Pill.propTypes = {
  option: propTypes.oneOfType([propTypes.string, propTypes.object]).isRequired,
  value: propTypes.string,
  onChange: propTypes.func.isRequired,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pill: {
    margin: PADDING / 2 / 2,
    borderRadius: PADDING * 2,
  },
  capitalize: {
    textTransform: 'capitalize',
  },
});
