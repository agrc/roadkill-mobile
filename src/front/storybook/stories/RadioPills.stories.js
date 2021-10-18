import { storiesOf } from '@storybook/react-native';
import React from 'react';
import RadioPills from '../../components/reports/RadioPills';

const Default = () => {
  const options = [
    {
      label: 'Option 1',
      value: 'option1',
    },
    {
      label: 'Option Hello 2',
      value: 'option2',
    },
    {
      label: 'Option 3',
      value: 'option3',
    },
    {
      label: 'Option Longer Label 4',
      value: 'option4',
    },
  ];
  return React.createElement(() => {
    const [value, setValue] = React.useState('');

    return <RadioPills value={value} onChange={setValue} options={options} label="test label" />;
  });
};

const OptionsAsStrings = () => {
  const options = ['frequent', 'common', 'latin', 'order', 'class', 'group'];
  return React.createElement(() => {
    const [value, setValue] = React.useState('');

    return <RadioPills value={value} onChange={setValue} options={options} label="test label" />;
  });
};

const UnknownOption = () => {
  const options = ['frequent', 'common', 'latin', 'order', 'class', 'group', 'unknown'];
  return React.createElement(() => {
    const [value, setValue] = React.useState('');

    return <RadioPills value={value} onChange={setValue} options={options} label="unknown option" />;
  });
};

storiesOf('RadioPills', module)
  .add('default', Default)
  .add('options as strings', OptionsAsStrings)
  .add('unknown option', UnknownOption);
