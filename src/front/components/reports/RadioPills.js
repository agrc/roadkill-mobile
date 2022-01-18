import { Button, Text } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PADDING } from '../../services/styles';

export default function RadioPills({ options, value, onChange, label, style }) {
  const renderPill = (option) => {
    let optionValue;
    let optionLabel;
    if (typeof option === 'string') {
      optionValue = option;
      optionLabel = option;
    } else {
      optionValue = option.value;
      optionLabel = option.label;
    }

    return (
      <Button
        key={optionValue}
        appearance={optionValue === value ? 'filled' : 'outline'}
        onPress={() => onChange(optionValue)}
        style={styles.pill}
        status={optionValue.toLowerCase() === 'unknown' ? 'info' : 'primary'}
        size="small"
      >
        {(evaProps) => (
          <Text {...evaProps} style={[evaProps.style, styles.capitalize]}>
            {optionLabel}
          </Text>
        )}
      </Button>
    );
  };

  return (
    <View style={style}>
      {label ? <Text category="label">{label}</Text> : null}
      <View style={styles.container}>{options.map(renderPill)}</View>
    </View>
  );
}

RadioPills.propTypes = {
  options: propTypes.array.isRequired,
  value: propTypes.string,
  onChange: propTypes.func.isRequired,
  label: propTypes.string,
  style: propTypes.object,
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
