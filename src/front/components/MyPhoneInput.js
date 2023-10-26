import { Input } from '@ui-kitten/components';
import propTypes from 'prop-types';
import { forwardRef, useCallback } from 'react';
import PhoneInput from 'react-phone-number-input/react-native-input';

const InnerPhoneInput = forwardRef(({ onChangeText, value, ...props }, ref) => {
  const innerOnChangeText = (newValue) => {
    if (newValue?.length <= 14) {
      onChangeText(newValue);
    }
  };

  return (
    <Input
      ref={ref}
      label="test"
      onChangeText={innerOnChangeText}
      value={value}
      {...props}
    />
  );
});
InnerPhoneInput.displayName = 'InnerPhoneInput';
InnerPhoneInput.propTypes = {
  onChangeText: propTypes.func.isRequired,
  value: propTypes.string.isRequired,
};

export default function MyPhoneInput({ value, style, onChange, label }) {
  return (
    <PhoneInput
      inputComponent={useCallback(
        (props) => (
          <InnerPhoneInput label={label} {...props} />
        ),
        [label],
      )}
      defaultCountry="US"
      value={value || undefined}
      style={style}
      onChange={(newValue) => onChange(newValue || '')}
    />
  );
}
MyPhoneInput.propTypes = {
  value: propTypes.string,
  style: propTypes.object,
  onChange: propTypes.func.isRequired,
  label: propTypes.string.isRequired,
};
